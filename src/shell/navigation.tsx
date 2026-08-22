"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronLeft, Gauge, Home, LogOut, Menu, PackageSearch, ReceiptText, ShoppingCart, UserCog, UsersRound, Truck } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

const financeItems = [
  { label: "Despesas", href: "/finance/expenses" },
  { label: "Garantias pós-pagas", href: "/finance/guarantees" },
  { label: "Participações", href: "/finance/participations" },
  { label: "Campanhas", href: "/finance/campaigns" },
  { label: "Capital em Giro", href: "/finance/working-capital" }
];

const productItems = [
  { label: "Meus produtos", href: "/products" },
  { label: "Cadastrar produto", href: "/products/new" }
];

const baseItems = [
  { label: "Command Center", href: "/", icon: Home, sub: "Nervo central" },
  { label: "Vendas", href: "/sales", icon: ShoppingCart, sub: "registro + comissão" },
  { label: "Expedição", href: "/expedition", icon: Truck, sub: "custos em operação", adminOnly: true },
  { label: "Produtos", href: "/products", icon: PackageSearch, sub: "catálogo e custos", adminOnly: true },
  { label: "Financeiro", href: "/finance/expenses", icon: ReceiptText, sub: "gestão financeira", adminOnly: true },
  { label: "Equipe / Vendedores", href: "/team", icon: UsersRound, sub: "comissões", adminOnly: true },
  { label: "Usuários", href: "/admin/users", icon: UserCog, sub: "gestão de acesso", adminOnly: true }
];

const mainItemClass =
  "group relative flex min-h-[58px] w-full items-center gap-3 rounded-2xl border px-4 text-left text-sm font-semibold uppercase tracking-[.02em] transition duration-200";

export function Navigation() {
  const pathname = usePathname();
  const { profile, isLoading, isAdmin, signOut } = useAuth();
  const financeActive = pathname.startsWith("/finance/");
  const productsActive = pathname.startsWith("/products");
  const [financeOpen, setFinanceOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = isAdmin ? baseItems : baseItems.filter((item) => item.href === "/sales");
  const initials = profile?.fullName
    ? profile.fullName
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "KA";

  useEffect(() => {
    if (financeActive) setFinanceOpen(true);
  }, [financeActive]);

  useEffect(() => {
    if (productsActive) setProductsOpen(true);
  }, [productsActive]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 right-4 z-40 grid h-12 w-12 place-items-center rounded-2xl border border-money/25 bg-[#07110e]/95 text-money shadow-glowGreen backdrop-blur-xl md:hidden"
        aria-label="Abrir navegação"
        aria-expanded={mobileOpen}
      >
        <Menu size={20} />
      </button>
      {mobileOpen ? <button type="button" className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} aria-label="Fechar navegação" /> : null}
      <aside
        className={cn(
          "paint-contain fixed inset-y-0 left-0 z-50 flex h-screen w-[264px] shrink-0 flex-col border-r border-white/10 bg-[#03090b]/98 p-4 backdrop-blur-2xl transition-transform duration-200 md:relative md:z-20 md:translate-x-0 md:bg-black/38",
          mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full md:visible"
        )}
      >
      <div className="mb-7 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3" aria-label="KAU — Command Center">
          <Gauge className="h-9 w-9 text-money" />
          <span className="money-text text-4xl font-black tracking-tight text-money">KAU</span>
        </Link>
        <motion.button
          type="button"
          onClick={() => setMobileOpen(false)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-full border border-white/10 bg-white/[.04] p-1.5 text-white/60 md:hidden"
          aria-label="Fechar navegação"
        >
          <ChevronLeft size={18} />
        </motion.button>
      </div>

      <nav className="premium-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" aria-label="Navegação principal">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : item.label === "Financeiro" ? financeActive : item.label === "Produtos" ? productsActive : pathname.startsWith(item.href);

          if (item.label === "Produtos") {
            return (
              <div key={item.label}>
                <motion.button
                  type="button"
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setProductsOpen((current) => !current)}
                  aria-expanded={productsOpen}
                  aria-controls="products-navigation"
                  className={cn(
                    mainItemClass,
                    active
                      ? "border-money/25 bg-money/10 text-money shadow-glowGreen"
                      : "border-transparent text-white/62 hover:border-white/[.08] hover:bg-white/[.045] hover:text-white"
                  )}
                >
                  {active ? <span className="absolute right-0 top-3 h-8 w-[3px] rounded-full bg-money shadow-glowGreen" /> : null}
                  <item.icon size={19} className="shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.label}</span>
                    <span className="block truncate text-[10px] font-medium normal-case tracking-normal text-white/36 group-hover:text-white/50">
                      {item.sub}
                    </span>
                  </span>
                  <ChevronDown size={16} className={cn("shrink-0 transition-transform duration-200", productsOpen && "rotate-180")} />
                </motion.button>

                <div
                  id="products-navigation"
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                    productsOpen ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="ml-7 mt-1 space-y-1 border-l border-white/10 pl-3">
                      {productItems.map((productItem) => {
                        const childActive = productItem.href === "/products" ? pathname === "/products" || (/^\/products\/[^/]+$/.test(pathname) && pathname !== "/products/new") : pathname.startsWith(productItem.href);
                        return (
                          <Link
                            key={productItem.href}
                            href={productItem.href}
                            tabIndex={productsOpen ? 0 : -1}
                            className={cn(
                              "relative flex min-h-10 items-center rounded-xl border px-3 text-xs font-semibold transition duration-200",
                              childActive
                                ? "border-money/20 bg-money/[.09] text-money"
                                : "border-transparent text-white/48 hover:bg-white/[.04] hover:text-white/80"
                            )}
                          >
                            {childActive ? <span className="absolute -left-[17px] h-5 w-0.5 rounded-full bg-money" /> : null}
                            {productItem.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (item.label === "Financeiro") {
            return (
              <div key={item.label}>
                <motion.button
                  type="button"
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setFinanceOpen((current) => !current)}
                  aria-expanded={financeOpen}
                  aria-controls="finance-navigation"
                  className={cn(
                    mainItemClass,
                    active
                      ? "border-money/25 bg-money/10 text-money shadow-glowGreen"
                      : "border-transparent text-white/62 hover:border-white/[.08] hover:bg-white/[.045] hover:text-white"
                  )}
                >
                  {active ? <span className="absolute right-0 top-3 h-8 w-[3px] rounded-full bg-money shadow-glowGreen" /> : null}
                  <item.icon size={19} className="shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{item.label}</span>
                    <span className="block truncate text-[10px] font-medium normal-case tracking-normal text-white/36 group-hover:text-white/50">
                      {item.sub}
                    </span>
                  </span>
                  <ChevronDown size={16} className={cn("shrink-0 transition-transform duration-200", financeOpen && "rotate-180")} />
                </motion.button>

                <div
                  id="finance-navigation"
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                    financeOpen ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="ml-7 mt-1 space-y-1 border-l border-white/10 pl-3">
                      {financeItems.map((financeItem) => {
                        const childActive = pathname.startsWith(financeItem.href);
                        return (
                          <Link
                            key={financeItem.href}
                            href={financeItem.href}
                            tabIndex={financeOpen ? 0 : -1}
                            className={cn(
                              "relative flex min-h-10 items-center rounded-xl border px-3 text-xs font-semibold transition duration-200",
                              childActive
                                ? "border-money/20 bg-money/[.09] text-money"
                                : "border-transparent text-white/48 hover:bg-white/[.04] hover:text-white/80"
                            )}
                          >
                            {childActive ? <span className="absolute -left-[17px] h-5 w-0.5 rounded-full bg-money" /> : null}
                            {financeItem.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <motion.div key={item.label} whileHover={{ x: 3 }} whileTap={{ scale: 0.985 }}>
              <Link
                href={item.href}
                className={cn(
                  mainItemClass,
                  active
                    ? "border-money/25 bg-money/10 text-money shadow-glowGreen"
                    : "border-transparent text-white/62 hover:border-white/[.08] hover:bg-white/[.045] hover:text-white"
                )}
              >
                {active ? <span className="absolute right-0 top-3 h-8 w-[3px] rounded-full bg-money shadow-glowGreen" /> : null}
                <item.icon size={19} className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.label}</span>
                  <span className="block truncate text-[10px] font-medium normal-case tracking-normal text-white/36 group-hover:text-white/50">
                    {item.sub}
                  </span>
                </span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="mt-4 shrink-0">
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4 shadow-panel">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-money/20 bg-money/10 text-sm font-black text-money">
              {initials}
            </div>
            <div className="min-w-0">
              {isLoading && !profile ? (
                <>
                  <div className="h-3.5 w-28 animate-pulse rounded-full bg-white/12" />
                  <div className="mt-2 h-2.5 w-20 animate-pulse rounded-full bg-white/[.07]" />
                </>
              ) : (
                <>
                  <p className="truncate text-sm font-bold">{profile?.fullName || "Usuário"}</p>
                  <p className="truncate text-xs text-white/50">{profile?.role === "admin" ? "Administradora" : profile?.sellerDisplayName || "Vendedora"}</p>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-bold uppercase tracking-[.08em] text-white/62 transition hover:border-white/15 hover:bg-white/[.06] hover:text-white"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
