import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const requiredTables = [
  "sales", "leads", "order_status_history", "cash_withdrawals", "expenses",
  "expense_tax_items", "expense_categories", "guarantee_settings", "postpaid_guarantees",
  "guarantee_payment_date_corrections", "ad_accounts", "campaigns", "capital_cycle_settings",
  "products", "product_cost_history", "product_kits", "manual_sale_cost_obligations",
  "coproducers", "product_coproducer_rules", "sale_coproducer_obligations", "sellers"
];

const columns = read("supabase/040_multitenancy_company_columns_and_backfill.sql");
const rls = read("supabase/042_multitenancy_rls_and_grants.sql");
const integrity = read("supabase/041_multitenancy_relational_integrity.sql");
const lockdown = read("supabase/046_multitenancy_post_deploy_lockdown.sql");
const auth = read("src/lib/auth.ts");

for (const table of requiredTables) {
  if (!columns.includes(`'${table}'`)) throw new Error(`company_id ausente do plano para ${table}`);
  if (!rls.includes(`'${table}'`)) throw new Error(`RLS tenant-aware ausente para ${table}`);
}

for (const relation of [
  "postpaid_guarantees_company_sale_fkey",
  "manual_costs_company_sale_fkey",
  "sales_company_campaign_fkey",
  "sales_company_product_fkey",
  "expenses_company_campaign_fkey",
  "sale_coproducer_company_sale_fkey"
]) {
  if (!integrity.includes(relation)) throw new Error(`FK cross-company ausente: ${relation}`);
}

if (!auth.includes("memberships.length !== 1")) throw new Error("requireAuth não exige uma única membership ativa");
if (!auth.includes("company.status !== \"active\"")) throw new Error("requireAuth não valida o status da empresa");
if (!rls.includes("revoke all on public.%I from public, anon, authenticated")) throw new Error("policies anônimas legadas não são revogadas");
if (!lockdown.includes("alter column company_id drop default")) throw new Error("lockdown pós-deploy não remove os defaults transitórios");

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}
for (const path of sourceFiles(fileURLToPath(new URL("../src", import.meta.url)))) {
  const source = readFileSync(path, "utf8");
  if (/body\.companyId|searchParams\.get\(["']companyId|headers\.get\(["']x-company-id/i.test(source)) {
    throw new Error(`companyId controlado pelo cliente detectado em ${path}`);
  }
}

console.log(`Multitenancy static isolation checks: ${requiredTables.length} tabelas, FKs críticas, RLS e auth OK.`);

// Contratos estáticos + matriz em memória. Não executa SQL nem substitui testes
// de integração de RLS no PostgreSQL, que exigem ambiente autorizado após revisão.
const normalize = (sql) => sql.replace(/\s+/g, " ").trim();
const genericSelect = rls.match(/'create policy %I on public\.%I for select to authenticated using \(([^\n]+)\)'/);
assert.equal(genericSelect?.[1], "public.is_company_admin(company_id)", "Leitura genérica deve ser administrativa");

const member = (user, row) => user.active && user.profileActive && user.companyActive && user.company === row.company;
const admin = (user, row) => member(user, row) && ["owner", "admin"].includes(user.role);
const own = (user, row) => member(user, row) && ["seller", "member"].includes(user.role) && user.name === row.seller;
const withdrawal = (user, row) => row.scope === "seller" && own(user, row);
const product = (user, row) => member(user, row) && row.status === "active" && row.available;
const contracts = new Map();
const contract = (table, sql, evaluate) => contracts.set(table, { sql: normalize(sql), evaluate });
for (const table of ["sellers", "campaigns", "ad_accounts"]) {
  contract(table, "public.is_company_member(company_id)", member);
}
for (const table of ["sales", "leads", "call_records"]) {
  contract(table, "public.is_company_seller_record(company_id, seller_name)", own);
}
contract("products", "public.is_company_member(company_id) and status = 'active' and available_for_new_sales = true", product);
contract("product_kits", `public.is_company_member(company_id) and is_active and exists (
  select 1 from public.products product
  where product.company_id = product_kits.company_id and product.id = product_kits.product_id
    and product.status = 'active' and product.available_for_new_sales = true
)`, (user, row) => member(user, row) && row.kitActive && row.parent?.company === row.company && product(user, row.parent));
contract("cash_withdrawals", "scope = 'seller' and public.is_company_seller_record(company_id, seller_name)", withdrawal);
contract("order_status_history", `public.is_company_member(company_id) and exists (
  select 1 from public.sales sale
  where sale.company_id = order_status_history.company_id and sale.id = order_status_history.sale_id
    and public.is_company_seller_record(sale.company_id, sale.seller_name)
)`, (user, row) => member(user, row) && row.parent?.company === row.company && own(user, row.parent));
contract("cash_withdrawal_sales", `public.is_company_member(company_id) and exists (
  select 1 from public.cash_withdrawals withdrawal
  where withdrawal.company_id = cash_withdrawal_sales.company_id and withdrawal.id = cash_withdrawal_sales.withdrawal_id
    and withdrawal.scope = 'seller'
    and public.is_company_seller_record(withdrawal.company_id, withdrawal.seller_name)
)`, (user, row) => member(user, row) && row.parent?.company === row.company && withdrawal(user, row.parent));

// As expressões são lidas do arquivo real: alteração/permissão adicional não
// reconhecida falha, em vez de testar somente uma cópia independente em JS.
const operational = new Set([...requiredTables, "call_records", "cash_withdrawal_sales"]);
const found = new Map();
for (const match of rls.matchAll(/create policy (\w+) on public\.(\w+) for select to authenticated\s+using\s*\(([\s\S]*?)\)'?;/g)) {
  const [, name, table, sql] = match;
  if (!operational.has(table)) continue;
  assert.equal(name, `${table}_company_member_select`);
  assert.ok(!found.has(table), `Policy adicional não revisada: ${table}`);
  const expected = contracts.get(table);
  assert.ok(expected, `Leitura não administrativa indevida: ${table}`);
  assert.equal(normalize(sql), expected.sql, `Predicado alterado: ${table}`);
  found.set(table, expected.evaluate);
}
assert.equal(found.size, contracts.size, "Todas as permissões excepcionais devem ser verificadas");
for (const helper of ["is_company_member", "is_company_admin", "is_company_seller_record"]) {
  const body = rls.match(new RegExp(`function public\\.${helper}\\([^]*?as \\$\\$([^]*?)\\$\\$;`))?.[1];
  assert.ok(body, `Helper ausente: ${helper}`);
  for (const condition of ["profile.is_active = true", "membership.is_active = true", "auth.uid()", "p_company_id"]) {
    assert.ok(body.includes(condition), `${helper}: falta ${condition}`);
  }
  if (helper !== "is_company_seller_record") assert.ok(body.includes("company.status = 'active'"));
  if (helper === "is_company_admin") assert.ok(body.includes("membership.role in ('owner', 'admin')"));
  if (helper === "is_company_seller_record") {
    assert.ok(body.includes("profile.seller_display_name = p_seller_name"));
    assert.ok(body.includes("membership.role in ('seller', 'member')"));
    assert.ok(body.includes("public.is_company_member(p_company_id)"));
  }
}

const canRead = (user, table, row) => Boolean(admin(user, row) || found.get(table)?.(user, row));
let authorizationCases = 0;
function check(user, table, row, expected) {
  assert.equal(canRead(user, table, row), expected, `${user.role} ${user.company} → ${table} ${row.company}`);
  authorizationCases++;
}
const administrative = [...operational].filter((table) => !contracts.has(table));
for (const company of ["A", "B"]) {
  for (const role of ["owner", "admin", "seller", "member"]) {
    const user = { company, role, name: "Vendedor", active: true, profileActive: true, companyActive: true };
    const row = { company, seller: "Vendedor", scope: "seller", status: "active", available: true, kitActive: true };
    row.parent = { ...row };
    for (const table of operational) {
      check(user, table, row, ["owner", "admin"].includes(role) || !administrative.includes(table));
      // Mesmo nome nas duas empresas não concede acesso cruzado.
      check(user, table, { ...row, company: company === "A" ? "B" : "A" }, false);
      check({ ...user, active: false }, table, row, false);
      check({ ...user, profileActive: false }, table, row, false);
      check({ ...user, companyActive: false }, table, row, false);
    }
    if (["seller", "member"].includes(role)) {
      for (const table of ["sales", "leads", "call_records", "cash_withdrawals"]) {
        check(user, table, { ...row, seller: "Outro vendedor" }, false);
      }
      check(user, "cash_withdrawals", { ...row, scope: "admin" }, false);
      for (const table of ["order_status_history", "cash_withdrawal_sales"]) {
        check(user, table, { ...row, parent: { ...row.parent, seller: "Outro vendedor" } }, false);
      }
      check(user, "products", { ...row, status: "paused" }, false);
      check(user, "products", { ...row, available: false }, false);
      check(user, "product_kits", { ...row, kitActive: false }, false);
      check(user, "product_kits", { ...row, parent: { ...row.parent, available: false } }, false);
    }
  }
}

const functions = read("supabase/043_multitenancy_financial_functions.sql");
const provisioning = read("supabase/044_multitenancy_company_provisioning.sql");
const storage = read("supabase/045_multitenancy_product_storage.sql");
assert.ok(!/insert\s+into\s+public\.guarantee_settings/i.test(provisioning), "Empresa nova não recebe regra comercial da A");
for (const condition of ["table_schema = 'public'", "table_name = 'manual_sale_cost_obligations'", "column_name = 'paid_at_timestamp'", "data_type = 'timestamp with time zone'", "038_manual_sale_cost_payment_timestamp.sql"]) {
  assert.ok(functions.includes(condition), `Pré-requisito 038 ausente: ${condition}`);
}
assert.ok(functions.indexOf("raise exception 'Migration 043 bloqueada") < functions.indexOf("create or replace function"));
assert.ok(integrity.includes("with ordinality as legacy(sale_id, position)"));
assert.ok(integrity.includes("where sale.company_id = withdrawal.company_id and sale.id::text = legacy.sale_id"));
assert.ok(integrity.includes("if v_invalid_count > 0 then"));
assert.ok(integrity.indexOf("raise exception 'Backfill de cash_withdrawal_sales bloqueado") < integrity.indexOf("insert into public.cash_withdrawal_sales"));
assert.ok(storage.includes("continuam públicos para quem conhece a URL"));
console.log(`Authorization contracts/model: ${authorizationCases} casos OK (A/B, owner/admin/seller/member, carteira própria, inativos). SQL/RLS real NÃO executado.`);
console.log("Bloqueadores: saques sem descarte silencioso, pré-requisito 038, empresa sem garantia padrão e dívida de storage verificados.");
