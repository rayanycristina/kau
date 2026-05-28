"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  ClipboardCopy,
  Clock3,
  Flame,
  MessageCircle,
  ShieldCheck,
  TimerReset,
  UserRound,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeadContactStatus, LeadPriority, LeadRecord, LeadTemperature } from "@/data/leads-types";

type EmotionalState = "frio" | "curioso" | "resistente" | "desconfiado" | "emocional" | "racional" | "quente" | "pronto pra fechar" | "esfriando";
type ResponseKey = "confirmou" | "desviou" | "racionalizou" | "preco" | "inseguro" | "pensar" | "esposa" | "sem_resposta" | "retorno";
type ScriptMode = "principal" | "curto" | "emocional" | "consultivo";
type Impact = "positive" | "warning" | "danger" | "neutral";

type LeadSignal = {
  state: EmotionalState;
  chance: number;
  momentum: number;
  risk: number;
  pressure: "suave" | "consultivo" | "emocional" | "urgência" | "direto";
  nextAction: string;
  cue: string;
};

type DealEvent = {
  id: string;
  leadId: string;
  label: string;
  detail: string;
  stage: string;
  impact: Impact;
  at: string;
};

type ClosingStage = {
  title: string;
  objective: string;
  psychologicalGoal: string;
  trigger: string;
  status: LeadContactStatus;
  scripts: Record<ScriptMode, string>;
  commonMistake: string;
  expectedResponse: string;
};

const statusLabel: Record<LeadContactStatus, string> = {
  new: "Novo",
  answered: "Atendeu",
  not_answered: "Não atendeu",
  called_no_answer: "Sem resposta",
  scheduled: "Agendado",
  call_soon: "Ligar já",
  return_tomorrow: "Retornar amanhã",
  proposal_sent: "Proposta enviada",
  sold: "Pedido confirmado",
  lost: "Perdido"
};

const temperatureLabel: Record<LeadTemperature, string> = { hot: "Quente", warm: "Morno", cold: "Frio" };
const priorityLabel: Record<LeadPriority, string> = { critical: "Crítica", high: "Alta", normal: "Normal", low: "Baixa" };

const closingStages: ClosingStage[] = [
  {
    title: "Abertura",
    objective: "Confirmar origem do contato e assumir comando sem parecer robótico.",
    psychologicalGoal: "baixar resistência inicial e abrir permissão para conduzir.",
    trigger: "reconhecimento",
    status: "answered",
    scripts: {
      principal: "Sr. [NOME], aqui é [SEU NOME], da Alphasin. O senhor solicitou a promoção do anúncio agora há pouco, correto?",
      curto: "Sr. [NOME], aqui é [SEU NOME], da Alphasin. O senhor pediu a promoção agora há pouco, certo?",
      emocional: "Sr. [NOME], eu vi sua solicitação e vou te ajudar a entender se essa promoção faz sentido para o seu caso, combinado?",
      consultivo: "Sr. [NOME], vou confirmar rapidinho seu pedido da promoção e entender seu caso antes de indicar qualquer coisa."
    },
    commonMistake: "falar preço antes de confirmar contexto.",
    expectedResponse: "cliente reconhece a solicitação."
  },
  {
    title: "Conexão",
    objective: "Criar segurança para o cliente responder com honestidade.",
    psychologicalGoal: "fazer o lead sentir atendimento humano e guiado.",
    trigger: "confiança",
    status: "answered",
    scripts: {
      principal: "Fica tranquilo, senhor [NOME]. Vou te fazer poucas perguntas para entender seu caso e não te indicar algo errado, combinado?",
      curto: "Vou entender seu caso antes de indicar qualquer coisa, tudo bem?",
      emocional: "A ideia aqui é te orientar com calma, sem empurrar nada. Primeiro eu entendo o que está acontecendo.",
      consultivo: "Minha orientação depende do seu sintoma e da intensidade. Por isso eu começo com algumas perguntas rápidas."
    },
    commonMistake: "parecer vendedor ansioso e perder autoridade.",
    expectedResponse: "cliente aceita ser conduzido."
  },
  {
    title: "Diagnóstico",
    objective: "Descobrir sintomas, intensidade e urgência real.",
    psychologicalGoal: "fazer o cliente verbalizar a dor.",
    trigger: "clareza",
    status: "answered",
    scripts: {
      principal: "O que mais incomoda hoje: pinga-pinga, jato fraco, sensação de bexiga cheia ou levantar muito de madrugada?",
      curto: "Hoje o que mais incomoda: jato fraco, pinga-pinga ou levantar de madrugada?",
      emocional: "Isso está atrapalhando mais seu sono, sua rotina ou sua vida íntima?",
      consultivo: "Isso acontece há quanto tempo? E quantas vezes em média o senhor levanta de madrugada?"
    },
    commonMistake: "explicar produto antes de entender o problema.",
    expectedResponse: "cliente informa sintoma principal."
  },
  {
    title: "Dor",
    objective: "Fazer o lead perceber o custo emocional do problema.",
    psychologicalGoal: "aumentar urgência interna sem pressão artificial.",
    trigger: "tensão",
    status: "answered",
    scripts: {
      principal: "Hoje o que mais pesa para o senhor é continuar convivendo com isso todos os dias, certo? Principalmente quando atrapalha sono, rotina ou vida íntima.",
      curto: "Isso já está atrapalhando sua rotina de verdade, correto?",
      emocional: "O mais cansativo é que isso vai tirando tranquilidade todos os dias, não é?",
      consultivo: "Quando isso começou a impactar seu dia a dia, o senhor percebeu mais no sono, na rotina ou na vida íntima?"
    },
    commonMistake: "não aprofundar a dor e deixar tudo racional demais.",
    expectedResponse: "cliente confirma impacto."
  },
  {
    title: "Desejo",
    objective: "Fazer o cliente visualizar alívio e melhora de rotina.",
    psychologicalGoal: "transformar incômodo em desejo de mudança.",
    trigger: "projeção",
    status: "answered",
    scripts: {
      principal: "Se o senhor conseguisse reduzir esse incômodo e dormir melhor, isso já mudaria bastante sua rotina, não mudaria?",
      curto: "Dormir melhor já mudaria sua rotina, certo?",
      emocional: "Imagina voltar a deitar sem aquela preocupação de levantar várias vezes. Esse é o ponto que a gente quer cuidar.",
      consultivo: "O objetivo é começar um cuidado que ajude o senhor a buscar mais controle e conforto no dia a dia."
    },
    commonMistake: "vender característica do produto sem ativar desejo.",
    expectedResponse: "cliente reconhece benefício desejado."
  },
  {
    title: "Explicação",
    objective: "Posicionar Alphasin como suporte natural com segurança.",
    psychologicalGoal: "criar autoridade sem prometer cura.",
    trigger: "segurança",
    status: "answered",
    scripts: {
      principal: "Pelo que o senhor me relatou, faz sentido iniciar um cuidado com suporte natural para saúde da próstata. Não substitui médico, mas pode ajudar como suporte no seu cuidado diário.",
      curto: "Pelo seu relato, faz sentido iniciar um suporte natural para saúde da próstata.",
      emocional: "A ideia é o senhor não deixar isso avançar sem cuidado. É suporte natural, com orientação responsável.",
      consultivo: "Não vou prometer cura e nem substituir médico. Vou te orientar pelo que faz sentido como suporte natural para o seu caso."
    },
    commonMistake: "prometer cura, evitar câncer ou substituir acompanhamento médico.",
    expectedResponse: "cliente entende a proposta."
  },
  {
    title: "Oferta",
    objective: "Indicar kit pela intensidade do caso, não pelo preço.",
    psychologicalGoal: "transformar preço em adequação de tratamento.",
    trigger: "decisão",
    status: "proposal_sent",
    scripts: {
      principal: "Pelo nível que o senhor me falou, eu indicaria o kit [LEVE / MÉDIO / FORTE]. O leve fica R$997, o médio R$1.497 e o forte R$2.497.",
      curto: "Pelo seu caso, o kit que faz mais sentido é o [KIT].",
      emocional: "Eu prefiro te indicar o que faz sentido para o seu nível de incômodo, não simplesmente o mais barato.",
      consultivo: "Eu não te colocaria no mais forte se não precisasse. Pelo que relatou, o ideal é [KIT], porque seu caso parece [LEVE / MÉDIO / FORTE]."
    },
    commonMistake: "dar opções demais sem recomendação.",
    expectedResponse: "cliente pergunta preço, forma ou confirma interesse."
  },
  {
    title: "Objeção",
    objective: "Descobrir a barreira real antes de responder.",
    psychologicalGoal: "recuperar movimento e baixar resistência.",
    trigger: "recuperação",
    status: "call_soon",
    scripts: {
      principal: "Claro. Só preciso entender: sua dúvida é valor, confiança no produto ou o momento de comprar agora? Porque cada uma eu resolvo de um jeito.",
      curto: "Sua dúvida é preço, confiança ou momento?",
      emocional: "Eu entendo. Só não quero te responder errado. O que travou mais: valor, medo de não funcionar ou decidir agora?",
      consultivo: "Perfeito. Me fala só qual ponto te travou para eu te orientar certo, sem te pressionar errado."
    },
    commonMistake: "responder sem descobrir a objeção verdadeira.",
    expectedResponse: "cliente revela objeção real."
  },
  {
    title: "Fechamento",
    objective: "Pedir confirmação do pedido de forma direta.",
    psychologicalGoal: "tirar da conversa e colocar em decisão.",
    trigger: "ação",
    status: "proposal_sent",
    scripts: {
      principal: "Posso confirmar seu pedido? Se sim, eu já separo aqui no seu nome e sigo para os dados de entrega.",
      curto: "Posso confirmar seu pedido agora?",
      emocional: "Pelo que o senhor me contou, faz sentido começar agora e não deixar isso para depois. Posso confirmar?",
      consultivo: "Pelo que conversamos, faz sentido iniciar. Posso confirmar para você?"
    },
    commonMistake: "continuar explicando depois que o cliente já está pronto.",
    expectedResponse: "cliente confirma ou revela última objeção."
  },
  {
    title: "Dados do pedido",
    objective: "Coletar dados sem quebrar o clima de fechamento.",
    psychologicalGoal: "fazer o pedido parecer já decidido.",
    trigger: "compromisso",
    status: "proposal_sent",
    scripts: {
      principal: "Perfeito. Vou confirmar seus dados: nome completo, CEP, número da casa e CPF na nota. Pode me passar nessa ordem?",
      curto: "Me passa nome, CEP, número e CPF para nota.",
      emocional: "Vou deixar tudo certinho para não ter erro na entrega, combinado?",
      consultivo: "Vou revisar tudo para evitar erro: nome, CEP, número da casa e CPF na nota, por favor."
    },
    commonMistake: "voltar a vender quando já deveria registrar.",
    expectedResponse: "cliente envia dados."
  },
  {
    title: "Confirmação",
    objective: "Confirmar pedido, entrega e compromisso final.",
    psychologicalGoal: "reduzir arrependimento e evitar abandono.",
    trigger: "segurança",
    status: "sold",
    scripts: {
      principal: "Confirmando então: o pedido Alphasin ficou no seu nome, entrega no endereço informado e pagamento conforme combinado. Está tudo certo para seguir?",
      curto: "Confirmo seu pedido Alphasin e sigo com o envio?",
      emocional: "Perfeito, senhor [NOME]. Fica tudo registrado e eu sigo com seu pedido agora.",
      consultivo: "Vou fechar aqui com tudo revisado: produto, endereço e forma de pagamento. Tudo certo?"
    },
    commonMistake: "não pedir confirmação final.",
    expectedResponse: "cliente confirma."
  },
  {
    title: "Follow-up",
    objective: "Nunca deixar o lead solto; sair com horário combinado.",
    psychologicalGoal: "manter controle da próxima ação.",
    trigger: "controle",
    status: "scheduled",
    scripts: {
      principal: "Perfeito. Qual horário eu posso te retornar? Assim eu deixo marcado e não te chamo em um momento ruim.",
      curto: "Qual horário eu posso te retornar?",
      emocional: "Para eu não deixar seu atendimento perdido, me fala um horário bom para eu voltar com você.",
      consultivo: "Combinado. Para não ficar solto, me passa um horário certo para eu retomar com você."
    },
    commonMistake: "aceitar 'me chama depois' sem hora marcada.",
    expectedResponse: "cliente informa horário."
  }
];

const responseActions: Array<{ key: ResponseKey; label: string; delta: number; status?: LeadContactStatus; targetStage?: number; nextStageDelta?: number; note: string; mode: ScriptMode; impact: Impact }> = [
  { key: "confirmou", label: "Confirmou", delta: 12, nextStageDelta: 1, note: "Avance. O lead aceitou a condução.", mode: "principal", impact: "positive" },
  { key: "desviou", label: "Desviou", delta: -5, nextStageDelta: 0, note: "Volte para pergunta simples. Recupere comando sem explicar demais.", mode: "curto", impact: "warning" },
  { key: "racionalizou", label: "Racionalizou", delta: -3, targetStage: 3, note: "Traga para impacto real. Pergunte como isso pesa na rotina.", mode: "emocional", impact: "warning" },
  { key: "preco", label: "Perguntou preço", delta: 3, targetStage: 6, note: "Preço apareceu. Indique pelo nível do caso, não pela promoção.", mode: "consultivo", impact: "neutral" },
  { key: "inseguro", label: "Ficou inseguro", delta: -9, targetStage: 7, note: "Reduza pressão. Use segurança e acompanhamento.", mode: "consultivo", impact: "warning" },
  { key: "pensar", label: "Quer pensar", delta: -12, targetStage: 11, status: "scheduled", note: "Não solte. Descubra o que precisa pensar e marque horário.", mode: "consultivo", impact: "danger" },
  { key: "esposa", label: "Falar com esposa", delta: -7, targetStage: 11, status: "scheduled", note: "Envie resumo curto e combine retorno após a conversa.", mode: "curto", impact: "warning" },
  { key: "sem_resposta", label: "Não respondeu", delta: -16, targetStage: 11, status: "called_no_answer", note: "Registrar tentativa e programar novo contato. Lead sem horário esfria.", mode: "curto", impact: "danger" },
  { key: "retorno", label: "Pediu retorno", delta: -4, targetStage: 11, status: "scheduled", note: "Defina horário. Lead sem horário vira perda silenciosa.", mode: "principal", impact: "warning" }
];

const objections = [
  { label: "Tá caro", response: "Eu entendo. Só não quero que o senhor compare apenas preço. Compare com continuar mais semanas levantando de madrugada e sem resolver o incômodo.", next: "Pergunte se a dúvida é valor ou confiança.", follow: "Retornar ainda hoje, enquanto a dor está ativa.", delta: -8 },
  { label: "Achei que era R$300", response: "O anúncio mostra condição promocional, mas o tratamento indicado depende do seu caso. Pelo que o senhor relatou, eu preciso te orientar pelo kit correto, não pelo mais barato.", next: "Voltar para intensidade dos sintomas.", follow: "Enviar resumo do kit indicado.", delta: -7 },
  { label: "Vou pensar", response: "Claro. Só me diz uma coisa: o que exatamente o senhor precisa pensar, valor, confiança ou conversar com alguém?", next: "Isolar a objeção real.", follow: "Marcar horário fixo de retorno.", delta: -10 },
  { label: "Vou falar com minha esposa", response: "Perfeito. Quer que eu te mande a explicação curta para vocês decidirem sem confusão? Que horário eu retorno depois que o senhor falar com ela?", next: "Enviar versão resumida.", follow: "Retornar após o horário combinado.", delta: -6 },
  { label: "Medo de não funcionar", response: "Justo. Por isso eu prefiro te orientar pelo seu sintoma. Não vou prometer cura; é um suporte natural para iniciar cuidado com segurança.", next: "Reforçar segurança, sem prometer cura.", follow: "Perguntar qual sintoma pesa mais.", delta: -5 },
  { label: "Vou ver financeiro", response: "Tudo bem. Para eu não te pressionar errado: a questão é pagar hoje ou escolher a forma mais confortável?", next: "Oferecer forma segura.", follow: "Retorno no mesmo período.", delta: -7 },
  { label: "Não atendeu", response: "Registrar tentativa e reagendar. Lead sem retorno definido esfria rápido.", next: "Definir nova tentativa.", follow: "Tentar novamente em janela de maior resposta.", delta: -12 },
  { label: "Me chama depois", response: "Perfeito. Qual horário é melhor? Assim eu retorno certo e não deixo seu atendimento perdido.", next: "Exigir horário.", follow: "Criar follow-up com hora marcada.", delta: -4 }
];

function brl(value?: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value || 0);
}

function safeTime(value?: string) {
  if (!value) return "sem horário";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "agendar";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function isOverdue(lead: LeadRecord) {
  if (!lead.nextActionAt || ["sold", "lost"].includes(lead.contactStatus)) return false;
  const date = new Date(lead.nextActionAt);
  return Number.isFinite(date.getTime()) && date.getTime() < Date.now();
}

function getBaseStageIndex(lead?: LeadRecord) {
  if (!lead) return 0;
  if (lead.contactStatus === "sold") return 10;
  if (lead.contactStatus === "proposal_sent") return 8;
  if (["scheduled", "call_soon", "return_tomorrow"].includes(lead.contactStatus)) return 11;
  if (lead.contactStatus === "answered") return lead.temperature === "hot" ? 5 : 2;
  if (["not_answered", "called_no_answer"].includes(lead.contactStatus)) return 11;
  return 0;
}

function getLeadSignal(lead?: LeadRecord, stageIndex = 0, boost = 0): LeadSignal {
  if (!lead) return { state: "frio", chance: 0, momentum: 0, risk: 0, nextAction: "Escolha um lead para iniciar atendimento.", pressure: "consultivo", cue: "Fila aguardando negociação ativa." };
  let score = 28 + boost + stageIndex * 5;
  if (lead.temperature === "hot") score += 24;
  if (lead.temperature === "warm") score += 10;
  if (lead.priority === "critical") score += 12;
  if (lead.priority === "high") score += 6;
  if (["answered", "proposal_sent", "call_soon"].includes(lead.contactStatus)) score += 12;
  if (lead.contactStatus === "sold") score = 100;
  if (lead.contactStatus === "lost") score = 3;
  if (isOverdue(lead)) score -= 24;
  if (lead.objections?.trim()) score -= 8;
  const chance = Math.max(3, Math.min(96, score));
  const momentum = Math.max(4, Math.min(100, score + (stageIndex >= 8 ? 8 : 0)));
  const risk = Math.max(4, Math.min(96, 100 - momentum + (isOverdue(lead) ? 18 : 0) + (lead.objections ? 8 : 0)));
  let state: EmotionalState = "curioso";
  if (lead.contactStatus === "lost") state = "esfriando";
  else if (lead.contactStatus === "sold" || stageIndex >= 10) state = "pronto pra fechar";
  else if (risk >= 72) state = "esfriando";
  else if (stageIndex >= 8 || chance >= 82) state = "pronto pra fechar";
  else if (chance >= 70) state = "quente";
  else if (lead.objections) state = "resistente";
  else if (stageIndex >= 3) state = "emocional";
  else if (lead.temperature === "cold") state = "frio";
  const pressure: LeadSignal["pressure"] = state === "pronto pra fechar" ? "direto" : state === "quente" ? "urgência" : state === "resistente" ? "consultivo" : state === "frio" ? "suave" : "emocional";
  const nextAction = state === "pronto pra fechar" ? "Peça confirmação agora." : state === "quente" ? "Acelere com pergunta de decisão." : state === "resistente" ? "Quebre a objeção antes de avançar." : state === "esfriando" ? "Marque retorno com horário." : "Faça a próxima pergunta guiada.";
  const cue = state === "pronto pra fechar" ? "Lead em modo fechamento. Reduza distrações e foque no pedido." : state === "esfriando" ? "Momentum caindo. Retomar controle com horário e pergunta simples." : "Atendimento guiado ativo. Siga a etapa e mantenha comando.";
  return { state, chance, momentum, risk, nextAction, pressure, cue };
}

function fillScript(script: string, lead?: LeadRecord) {
  return script.replaceAll("[NOME]", lead?.customerName?.split(" ")[0] || "cliente");
}

async function persistLeadStatus(id: string, contactStatus: LeadContactStatus) {
  await fetch(`/api/leads?id=${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactStatus }) }).catch(() => null);
}

export function SalesCommandScreen() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [stageByLead, setStageByLead] = useState<Record<string, number>>({});
  const [boostByLead, setBoostByLead] = useState<Record<string, number>>({});
  const [events, setEvents] = useState<DealEvent[]>([]);
  const [feedback, setFeedback] = useState("Selecione um lead e siga a mesa de fechamento.");
  const [scriptMode, setScriptMode] = useState<ScriptMode>("principal");
  const [selectedObjection, setSelectedObjection] = useState(objections[0]);
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/leads", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (!alive) return;
        const incoming = ((payload.leads ?? []) as LeadRecord[]).filter(Boolean);
        setLeads(incoming);
        setSelectedId((current) => current || incoming.find((lead) => !["sold", "lost"].includes(lead.contactStatus))?.id || incoming[0]?.id || null);
        setStageByLead((current) => {
          const next = { ...current };
          for (const lead of incoming) if (next[lead.id] === undefined) next[lead.id] = getBaseStageIndex(lead);
          return next;
        });
      })
      .catch(() => setLeads([]))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads
      .filter((lead) => !q || [lead.customerName, lead.customerPhone, lead.city, lead.sellerName, lead.nextAction, lead.objections].filter(Boolean).join(" ").toLowerCase().includes(q))
      .sort((a, b) => getLeadSignal(b, stageByLead[b.id] ?? getBaseStageIndex(b), boostByLead[b.id] || 0).momentum - getLeadSignal(a, stageByLead[a.id] ?? getBaseStageIndex(a), boostByLead[a.id] || 0).momentum);
  }, [leads, query, stageByLead, boostByLead]);

  const visibleLeads = useMemo(() => filteredLeads.slice(0, 50), [filteredLeads]);
  const selected = useMemo(() => filteredLeads.find((lead) => lead.id === selectedId) || filteredLeads[0] || leads[0], [filteredLeads, leads, selectedId]);
  const stageIndex = selected ? stageByLead[selected.id] ?? getBaseStageIndex(selected) : 0;
  const currentStage = closingStages[stageIndex] || closingStages[0];
  const signal = getLeadSignal(selected, stageIndex, selected ? boostByLead[selected.id] || 0 : 0);
  const inClosingMode = signal.state === "pronto pra fechar" || stageIndex >= 8;
  const selectedScript = fillScript(currentStage.scripts[scriptMode], selected);
  const leadEvents = selected ? events.filter((event) => event.leadId === selected.id).slice(0, 6) : [];

  const stats = useMemo(() => {
    const open = leads.filter((lead) => !["sold", "lost"].includes(lead.contactStatus));
    const hot = open.filter((lead) => getLeadSignal(lead, stageByLead[lead.id] ?? getBaseStageIndex(lead), boostByLead[lead.id] || 0).chance >= 70).length;
    const followUps = open.filter((lead) => ["scheduled", "call_soon", "return_tomorrow", "called_no_answer"].includes(lead.contactStatus)).length;
    const confirmed = leads.filter((lead) => lead.contactStatus === "sold").length;
    const value = open.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0);
    return { open: open.length, hot, followUps, confirmed, value };
  }, [leads, stageByLead, boostByLead]);

  function recordEvent(lead: LeadRecord, label: string, detail: string, impact: Impact, stage = currentStage.title) {
    const event: DealEvent = { id: `${lead.id}-${Date.now()}`, leadId: lead.id, label, detail, stage, impact, at: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) };
    setEvents((current) => [event, ...current].slice(0, 40));
  }

  function selectLead(id: string) {
    setSelectedId(id);
    setFeedback("Lead carregado. Comece pela etapa indicada e mantenha comando.");
  }

  function updateLeadStatus(lead: LeadRecord, status: LeadContactStatus, extra?: Partial<LeadRecord>) {
    setLeads((current) => current.map((item) => (item.id === lead.id ? { ...item, contactStatus: status, updatedAt: new Date().toISOString(), ...extra } : item)));
    void persistLeadStatus(lead.id, status);
  }

  function applyResponse(action: (typeof responseActions)[number]) {
    if (!selected) return;
    const current = stageByLead[selected.id] ?? getBaseStageIndex(selected);
    const nextStage = Math.max(0, Math.min(closingStages.length - 1, action.targetStage ?? current + (action.nextStageDelta ?? 0)));
    const status = action.status || closingStages[nextStage].status;
    setStageByLead((map) => ({ ...map, [selected.id]: nextStage }));
    setBoostByLead((map) => ({ ...map, [selected.id]: Math.max(-35, Math.min(35, (map[selected.id] || 0) + action.delta)) }));
    setScriptMode(action.mode);
    updateLeadStatus(selected, status, action.status === "scheduled" ? { nextAction: "Follow-up obrigatório: definir horário" } : undefined);
    setFeedback(action.note);
    recordEvent(selected, action.label, action.note, action.impact, closingStages[nextStage].title);
  }

  function advanceStage() {
    if (!selected) return;
    const nextStage = Math.min(closingStages.length - 1, stageIndex + 1);
    const status = closingStages[nextStage].status;
    setStageByLead((map) => ({ ...map, [selected.id]: nextStage }));
    setBoostByLead((map) => ({ ...map, [selected.id]: Math.min(35, (map[selected.id] || 0) + 8) }));
    setScriptMode("principal");
    updateLeadStatus(selected, status);
    setFeedback("Etapa avançada. Script, tom e momentum atualizados.");
    recordEvent(selected, "Etapa avançada", `Agora: ${closingStages[nextStage].title}`, "positive", closingStages[nextStage].title);
  }

  function markFollowUp() {
    if (!selected) return;
    setStageByLead((map) => ({ ...map, [selected.id]: 11 }));
    setScriptMode("principal");
    updateLeadStatus(selected, "scheduled", { nextAction: "Retornar com horário marcado" });
    setFeedback("Follow-up criado. Não deixe o lead solto: confirme um horário específico.");
    recordEvent(selected, "Follow-up obrigatório", "Sistema mudou para controle de retorno com horário.", "warning", "Follow-up");
  }

  function handleObjection(item: (typeof objections)[number]) {
    if (!selected) return;
    setSelectedObjection(item);
    setStageByLead((map) => ({ ...map, [selected.id]: 7 }));
    setBoostByLead((map) => ({ ...map, [selected.id]: Math.max(-35, (map[selected.id] || 0) + item.delta) }));
    setScriptMode("consultivo");
    updateLeadStatus(selected, "call_soon", { objections: item.label, nextAction: item.follow });
    setFeedback(`Objeção ativada: ${item.next}`);
    recordEvent(selected, `Objeção: ${item.label}`, item.next, item.delta <= -9 ? "danger" : "warning", "Objeção");
  }

  function copyScript() {
    void navigator.clipboard?.writeText(selectedScript);
    if (selected) recordEvent(selected, "Script copiado", "Vendedor preparou fala da etapa atual.", "neutral");
    setFeedback("Script copiado. Use a fala e registre a resposta do lead.");
  }

  function confirmOrder() {
    if (!selected) return;
    setStageByLead((map) => ({ ...map, [selected.id]: 10 }));
    setBoostByLead((map) => ({ ...map, [selected.id]: 35 }));
    updateLeadStatus(selected, "sold");
    setFeedback("Pedido confirmado. Faça a revisão final e registre a venda.");
    recordEvent(selected, "Pedido confirmado", "Lead entrou em confirmação final.", "positive", "Confirmação");
  }

  return (
    <div className={cn("kau-guided-command relative pb-5", inClosingMode && "closing-mode", focusMode && "focus-mode")}> 
      <header className="kau-guided-topbar mb-4 rounded-[2rem] px-5 py-4 md:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="kau-live-badge"><span /> Assistente de fechamento ao vivo</span>
              {inClosingMode ? <span className="kau-mode-badge">Modo fechamento ativo</span> : <span className="kau-soft-badge">Mesa guiada</span>}
              <button type="button" onClick={() => setFocusMode((value) => !value)} className="kau-soft-badge">{focusMode ? "Foco desligado" : "Modo foco"}</button>
            </div>
            <h1 className="mt-3 text-[clamp(1.9rem,3.2vw,3.7rem)] font-black leading-[.92] tracking-[-.075em] text-white">Sales Command</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">Sistema operacional de fechamento guiado. Entre no lead, siga a etapa, registre a resposta e deixe o sistema conduzir a venda.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5 xl:w-[720px]">
            <CommandMetric label="Atendimento" value={stats.open} detail="leads ativos" tone="cyan" />
            <CommandMetric label="Quentes" value={stats.hot} detail="alta intenção" tone="green" />
            <CommandMetric label="Follow-ups" value={stats.followUps} detail="hoje" tone="amber" />
            <CommandMetric label="Confirmados" value={stats.confirmed} detail="pedidos" tone="blue" />
            <CommandMetric label="Potencial" value={brl(stats.value)} detail="em jogo" tone="rose" />
          </div>
        </div>
      </header>

      <section className="grid gap-4 2xl:grid-cols-[340px_minmax(0,1fr)_380px]">
        <aside className="kau-guided-panel rounded-[1.8rem] p-4">
          <PanelHeader icon={UserRound} eyebrow="Fila viva" title="Leads para atender" />
          <div className="mt-4 rounded-2xl border border-white/[.07] bg-white/[.055] px-3 py-2.5">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar lead, cidade, vendedor..." className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-white/36" />
          </div>
          <div className="kau-soft-scrollbar mt-4 max-h-[calc(100vh-306px)] min-h-[560px] space-y-2 overflow-y-auto pr-1">
            {loading ? <LeadSkeleton /> : null}
            {!loading && filteredLeads.length === 0 ? <EmptyState title="Nenhum lead na fila" description="Quando novos leads chegarem, eles entram aqui para atendimento guiado." /> : null}
            {!loading && filteredLeads.length > visibleLeads.length ? <p className="rounded-xl bg-white/[.04] px-3 py-2 text-center text-[11px] font-bold text-white/42">Mostrando os 50 leads mais importantes. Use a busca para localizar outros.</p> : null}
            {visibleLeads.map((lead, index) => (
              <LeadQueueItem key={lead.id} lead={lead} index={index} active={selected?.id === lead.id} stage={closingStages[stageByLead[lead.id] ?? getBaseStageIndex(lead)]?.title || "Abertura"} signal={getLeadSignal(lead, stageByLead[lead.id] ?? getBaseStageIndex(lead), boostByLead[lead.id] || 0)} onSelect={() => selectLead(lead.id)} />
            ))}
          </div>
        </aside>

        <main className="kau-closing-table rounded-[2.2rem] p-4 md:p-6">
            <div className="kau-motion-lite">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatePill state={signal.state} />
                    <span className="kau-soft-badge">Etapa {stageIndex + 1}/{closingStages.length}</span>
                    <span className="kau-soft-badge">Tom {signal.pressure}</span>
                  </div>
                  <h2 className="mt-4 text-[clamp(1.6rem,3.2vw,3.8rem)] font-black leading-[.94] tracking-[-.07em] text-white">{selected?.customerName || "Escolha um lead"}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">{selected ? `${selected.city || "sem cidade"} · ${selected.sellerName} · ${brl(selected.estimatedValue)}` : "A mesa de fechamento ativa script, etapa e próxima ação."}</p>
                </div>
                <div className="grid min-w-[280px] grid-cols-3 gap-2">
                  <GaugeBox label="Chance" value={`${signal.chance}%`} tone="green" />
                  <GaugeBox label="Momentum" value={`${signal.momentum}%`} tone="cyan" />
                  <GaugeBox label="Risco" value={`${signal.risk}%`} tone="rose" />
                </div>
              </div>

              <div className="mt-6"><ProgressJourney stageIndex={stageIndex} /></div>

              <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_296px]">
                <div className="kau-script-stage rounded-[2rem] p-5 md:p-6">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[.24em] text-emerald-100/62">{currentStage.title} · gatilho {currentStage.trigger}</p>
                      <h3 className="mt-2 text-2xl font-black tracking-[-.055em] text-white">{currentStage.objective}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/54">Objetivo psicológico: {currentStage.psychologicalGoal}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(["principal", "curto", "emocional", "consultivo"] as const).map((mode) => <button key={mode} type="button" onClick={() => setScriptMode(mode)} className={cn("rounded-full px-3 py-2 text-xs font-black transition", scriptMode === mode ? "bg-emerald-300 text-slate-950" : "bg-white/[.07] text-white/56 hover:bg-white/[.1]")}>{mode}</button>)}
                    </div>
                  </div>
                  <div className="mt-6 rounded-[1.7rem] border border-white/[.08] bg-white/[.055] p-5">
                    <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/36">Script ativo · fale agora</p>
                    <p className="mt-3 text-[clamp(1.25rem,2.05vw,1.85rem)] font-semibold leading-[1.35] tracking-[-.035em] text-white">“{selectedScript}”</p>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <InfoTile label="Resposta esperada" text={currentStage.expectedResponse} icon={MessageCircle} />
                    <InfoTile label="Erro comum" text={currentStage.commonMistake} icon={AlertTriangle} />
                    <InfoTile label="Leitura da mesa" text={signal.cue} icon={BrainCircuit} />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button type="button" onClick={copyScript} className="kau-command-secondary"><ClipboardCopy size={15} /> Copiar script</button>
                    <button type="button" onClick={markFollowUp} className="kau-command-secondary"><Clock3 size={15} /> Marcar retorno</button>
                    <button type="button" onClick={advanceStage} className="kau-command-primary">Avançar etapa <ArrowRight size={16} /></button>
                    {inClosingMode ? <button type="button" onClick={confirmOrder} className="kau-command-primary"><Flame size={16} /> Confirmar pedido</button> : null}
                  </div>
                </div>

                <div className="kau-feedback-panel rounded-[2rem] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[.22em] text-white/40">Resposta do lead</p>
                  <div className="mt-3 grid gap-2">
                    {responseActions.map((action) => <button key={action.key} type="button" onClick={() => applyResponse(action)} className="kau-response-button">{action.label}<ChevronRight size={14} /></button>)}
                  </div>
                  <div className="mt-4 rounded-[1.4rem] border border-white/[.08] bg-black/20 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-100/56">Feedback operacional</p>
                    <p className="mt-2 text-sm leading-6 text-white/68">{feedback}</p>
                  </div>
                  <div className="mt-3 rounded-[1.4rem] border border-white/[.08] bg-white/[.035] p-3">
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/36">Histórico da conversa</p>
                    <div className="mt-2 space-y-2">
                      {leadEvents.length === 0 ? <p className="text-xs leading-5 text-white/42">Cada clique registra a condução aqui. A venda deixa de ser tela parada.</p> : leadEvents.map((event) => <DealEventLine key={event.id} event={event} />)}
                    </div>
                  </div>
                </div>
              </section>
            </div>
        </main>

        <aside className="space-y-4">
          <section className="kau-guided-panel rounded-[1.8rem] p-4">
            <PanelHeader icon={BrainCircuit} eyebrow="IA de fechamento" title="Próxima ação" />
            <div className="mt-4 rounded-[1.6rem] border border-white/[.08] bg-white/[.055] p-4">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-white/38">Agora</p>
              <p className="mt-2 text-2xl font-black tracking-[-.055em] text-white">{signal.nextAction}</p>
              <p className="mt-3 text-sm leading-6 text-white/56">{signal.cue}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniStat label="Status" value={signal.state} />
              <MiniStat label="Tom" value={signal.pressure} />
            </div>
          </section>

          <section className="kau-guided-panel rounded-[1.8rem] p-4">
            <PanelHeader icon={ShieldCheck} eyebrow="Objeções" title="Resposta pronta" />
            <div className="mt-4 flex flex-wrap gap-2">
              {objections.map((item) => <button key={item.label} type="button" onClick={() => handleObjection(item)} className={cn("rounded-full px-3 py-2 text-xs font-black transition", selectedObjection.label === item.label ? "bg-amber-300 text-slate-950" : "bg-white/[.07] text-white/55 hover:bg-white/[.1]")}>{item.label}</button>)}
            </div>
                <div className="mt-4 rounded-[1.6rem] border border-white/[.08] bg-black/18 p-4 kau-motion-lite">
                <p className="text-base font-black tracking-[-.035em] text-white">{selectedObjection.label}</p>
                <p className="mt-3 text-sm leading-6 text-white/66">“{selectedObjection.response}”</p>
                <div className="mt-4 space-y-2 text-xs leading-5 text-white/50"><p><b className="text-cyan-100/80">Próximo passo:</b> {selectedObjection.next}</p><p><b className="text-emerald-100/80">Follow-up:</b> {selectedObjection.follow}</p></div>
              </div>
            </section>

          <section className="kau-guided-panel rounded-[1.8rem] p-4">
            <PanelHeader icon={TimerReset} eyebrow="Follow-up" title="Nunca deixar solto" />
            <div className="mt-4 space-y-2">
              {selected ? <FollowRule text={selected.nextActionAt ? `Retorno: ${safeTime(selected.nextActionAt)}` : "Defina um horário antes de sair da conversa."} danger={!selected.nextActionAt && !["sold", "lost"].includes(selected.contactStatus)} /> : <FollowRule text="Escolha um lead para criar follow-up." />}
              <FollowRule text="Se disser ‘vou pensar’, pergunte exatamente o que precisa pensar." />
              <FollowRule text="Se disser ‘esposa’, envie resumo e marque retorno depois da conversa." />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function CommandMetric({ label, value, detail, tone }: { label: string; value: string | number; detail: string; tone: "cyan" | "green" | "amber" | "blue" | "rose" }) {
  return <div className={cn("kau-command-metric rounded-2xl p-3", `tone-${tone}`)}><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/48">{label}</p><p className="mt-2 text-xl font-black tracking-[-.055em] text-white">{value}</p><p className="mt-1 text-[11px] font-semibold text-white/42">{detail}</p></div>;
}

function LeadQueueItem({ lead, index, active, stage, signal, onSelect }: { lead: LeadRecord; index: number; active: boolean; stage: string; signal: LeadSignal; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={cn("kau-lead-line w-full rounded-2xl p-3 text-left", active && "active")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", signal.chance >= 75 ? "bg-emerald-300" : signal.risk >= 70 ? "bg-rose-300" : "bg-cyan-300")} /><p className="truncate text-sm font-black tracking-[-.025em] text-white">{lead.customerName}</p></div>
          <p className="mt-1 truncate text-xs font-semibold text-white/46">{lead.city || "sem cidade"} · {lead.sellerName}</p>
        </div>
        <span className="rounded-full bg-white/[.07] px-2 py-1 text-[10px] font-black uppercase tracking-[.11em] text-white/48">{signal.chance}%</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5"><MicroTag>{stage}</MicroTag><MicroTag>{temperatureLabel[lead.temperature]}</MicroTag><MicroTag>{statusLabel[lead.contactStatus]}</MicroTag><MicroTag>{priorityLabel[lead.priority]}</MicroTag></div>
      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3"><div className="h-1.5 overflow-hidden rounded-full bg-white/[.08]"><div style={{ width: `${signal.momentum}%` }} className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 transition-[width] duration-200 ease-out" /></div><p className="text-xs font-black text-white/70">{brl(lead.estimatedValue)}</p></div>
    </button>
  );
}

function ProgressJourney({ stageIndex }: { stageIndex: number }) {
  return <div className="kau-progress-rail rounded-[1.4rem] p-3"><div className="grid grid-cols-4 gap-2 xl:grid-cols-12">{closingStages.map((stage, index) => { const done = index < stageIndex; const active = index === stageIndex; return <div key={stage.title} className={cn("kau-stage-node", done && "done", active && "active")}><span>{index + 1}</span><p>{stage.title}</p></div>; })}</div></div>;
}

function GaugeBox({ label, value, tone }: { label: string; value: string; tone: "green" | "cyan" | "rose" }) {
  return <div className={cn("kau-gauge-box rounded-2xl p-3", `tone-${tone}`)}><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/42">{label}</p><p className="mt-2 text-2xl font-black tracking-[-.06em] text-white">{value}</p></div>;
}

function InfoTile({ label, text, icon: Icon }: { label: string; text: string; icon: LucideIcon }) {
  return <div className="rounded-[1.4rem] border border-white/[.07] bg-white/[.04] p-4"><div className="flex items-center gap-2"><Icon size={15} className="text-cyan-100/70" /><p className="text-[10px] font-black uppercase tracking-[.17em] text-white/38">{label}</p></div><p className="mt-2 text-sm leading-6 text-white/62">{text}</p></div>;
}

function PanelHeader({ icon: Icon, eyebrow, title }: { icon: LucideIcon; eyebrow: string; title: string }) {
  return <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[.07] text-cyan-100"><Icon size={17} /></div><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-white/38">{eyebrow}</p><h3 className="mt-1 text-lg font-black tracking-[-.045em] text-white">{title}</h3></div></div>;
}

function StatePill({ state }: { state: EmotionalState }) {
  const cls = state === "pronto pra fechar" || state === "quente" ? "bg-emerald-300/14 text-emerald-100" : state === "esfriando" || state === "resistente" ? "bg-rose-300/12 text-rose-100" : "bg-cyan-300/12 text-cyan-100";
  return <span className={cn("rounded-full px-3 py-2 text-xs font-black uppercase tracking-[.14em]", cls)}>{state}</span>;
}

function DealEventLine({ event }: { event: DealEvent }) {
  const color = event.impact === "positive" ? "text-emerald-100" : event.impact === "danger" ? "text-rose-100" : event.impact === "warning" ? "text-amber-100" : "text-cyan-100";
  return <div className="rounded-xl bg-white/[.045] px-3 py-2"><div className="flex items-center justify-between gap-2"><p className={cn("text-xs font-black", color)}>{event.label}</p><p className="text-[10px] font-bold text-white/34">{event.at}</p></div><p className="mt-1 text-[11px] leading-4 text-white/45">{event.stage} · {event.detail}</p></div>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[1.2rem] bg-white/[.045] p-3"><p className="text-[10px] font-black uppercase tracking-[.15em] text-white/36">{label}</p><p className="mt-1 text-sm font-black text-white">{value}</p></div>;
}

function FollowRule({ text, danger }: { text: string; danger?: boolean }) {
  return <div className={cn("flex items-start gap-3 rounded-[1.25rem] p-3", danger ? "bg-rose-300/10 text-rose-100" : "bg-white/[.045] text-white/62")}><CheckCircle2 size={15} className="mt-0.5 shrink-0" /><p className="text-sm leading-5">{text}</p></div>;
}

function MicroTag({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white/[.065] px-2 py-1 text-[10px] font-black uppercase tracking-[.11em] text-white/46">{children}</span>;
}

function LeadSkeleton() {
  return <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-[108px] animate-pulse rounded-2xl bg-white/[.05]" />)}</div>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-2xl border border-white/[.07] bg-white/[.045] p-5 text-center"><p className="font-black text-white">{title}</p><p className="mt-2 text-sm leading-6 text-white/48">{description}</p></div>;
}
