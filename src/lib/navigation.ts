/**
 * Mapa de navegação do KAIROS (puro e testável): módulos, abas de cada módulo,
 * a cena de fundo de cada um e a dica que aparece na barra de busca.
 */
import { FINANCE_SUBNAV, isFinancePath } from "@/lib/sections";

export type ModuleId = "inicio" | "financas" | "rotina" | "registrar";

/** Cena (foto de fundo) de cada módulo: ajuda a saber onde você está. */
export type SceneId = "casa" | "horizonte" | "rotina";

/**
 * `bright`: brilho da foto em cada tema. No claro, as fotos mais escuras
 * (montanhas) ganham mais luz para o vidro manter o contraste do texto. No
 * noturno a foto fica em preto e branco e bem escura: o tema é preto de verdade.
 */
export const SCENES: Record<SceneId, { src: string; position: string; bright: { light: number; dark: number } }> = {
  casa: { src: "/photos/cena-casa.jpg", position: "center 62%", bright: { light: 0.86, dark: 0.42 } },
  horizonte: { src: "/photos/login-montanhas.jpg", position: "center 40%", bright: { light: 1.04, dark: 0.55 } },
  rotina: { src: "/photos/cena-rotina.jpg", position: "center 58%", bright: { light: 0.9, dark: 0.42 } },
};

export type ModuleDef = {
  id: ModuleId;
  href: string;
  label: string;
  scene: SceneId;
  /** exemplo do que dá para escrever na barra de busca/registro */
  hint: string;
};

export const MODULES: readonly ModuleDef[] = [
  { id: "inicio", href: "/", label: "Início", scene: "casa", hint: "Buscar uma tela ou registrar “café 12,50”" },
  { id: "financas", href: "/financas", label: "Finanças", scene: "horizonte", hint: "Registrar “uber 23,90 ontem” ou buscar" },
  { id: "rotina", href: "/rotina", label: "Rotina", scene: "rotina", hint: "Registrar “tarefa: renovar CNH até 20/12”" },
  { id: "registrar", href: "/registrar", label: "Registrar", scene: "casa", hint: "Registrar “lembrar de pagar a luz amanhã 9h”" },
];

const startsWithPath = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

/** Em qual módulo está este caminho? (o que não é de nenhum cai no Início) */
export function moduleFor(pathname: string): ModuleId {
  if (isFinancePath(pathname)) return "financas";
  if (startsWithPath(pathname, "/rotina")) return "rotina";
  if (startsWithPath(pathname, "/registrar")) return "registrar";
  return "inicio";
}

export function moduleDef(id: ModuleId): ModuleDef {
  return MODULES.find((m) => m.id === id) ?? MODULES[0];
}

export function sceneFor(pathname: string): SceneId {
  return moduleDef(moduleFor(pathname)).scene;
}

// ---------------------------------------------------------------------
// Abas de cada módulo (doca de baixo no computador; faixa no topo no celular)
// ---------------------------------------------------------------------

export type SubItem = {
  id: string;
  href: string;
  label: string;
  /** nome curto para a doca do celular */
  short: string;
};

export const ROUTINE_TABS = [
  { id: "hoje", label: "Hoje" },
  { id: "tarefas", label: "Tarefas" },
  { id: "lembretes", label: "Lembretes" },
  { id: "notas", label: "Notas" },
] as const;
export type RoutineTab = (typeof ROUTINE_TABS)[number]["id"];

/** Aba da Rotina a partir do ?aba= (qualquer outra coisa vira "hoje"). */
export function routineTab(raw: string | string[] | null | undefined): RoutineTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return ROUTINE_TABS.find((t) => t.id === value)?.id ?? "hoje";
}

const FINANCE_SHORT: Record<string, string> = {
  "/dashboard": "Geral",
  "/mes": "Mês",
  "/transacoes": "Transações",
  "/contas": "Contas",
  "/cartoes": "Cartões",
  "/planejar": "Planejar",
};

export function subnavFor(module: ModuleId): SubItem[] {
  if (module === "financas") {
    return FINANCE_SUBNAV.map((item) => ({
      id: item.href.slice(1),
      href: item.href,
      label: item.label,
      short: FINANCE_SHORT[item.href] ?? item.label,
    }));
  }
  if (module === "rotina") {
    return ROUTINE_TABS.map((t) => ({
      id: t.id,
      href: t.id === "hoje" ? "/rotina" : `/rotina?aba=${t.id}`,
      label: t.label,
      short: t.label,
    }));
  }
  return [];
}

/** Qual aba está ativa? `aba` é o ?aba= atual (só importa na Rotina). */
export function activeSubId(
  module: ModuleId,
  pathname: string,
  aba: string | null | undefined,
): string | null {
  if (module === "rotina") return routineTab(aba);
  if (module === "financas") {
    const hit = FINANCE_SUBNAV.find((item) => startsWithPath(pathname, item.href));
    // "/financas" só redireciona: conta como a visão geral
    return hit ? hit.href.slice(1) : "dashboard";
  }
  return null;
}

// ---------------------------------------------------------------------
// Paleta de comandos (barra de busca): todas as telas e atalhos
// ---------------------------------------------------------------------

export type Destination = {
  href: string;
  label: string;
  group: "Telas" | "Atalhos";
  description: string;
  /** palavras extras para a busca */
  keywords: string;
};

export const DESTINATIONS: readonly Destination[] = [
  { href: "/", label: "Início", group: "Telas", description: "Seus setores e o resumo do dia", keywords: "home casa painel" },
  { href: "/dashboard", label: "Visão geral", group: "Telas", description: "Saldo, saúde do mês e para onde foi o dinheiro", keywords: "financas saldo resumo dashboard" },
  { href: "/mes", label: "Meu mês", group: "Telas", description: "Renda, contas fixas e o semáforo do mês", keywords: "contas fixas vencimentos semaforo" },
  { href: "/transacoes", label: "Transações", group: "Telas", description: "Tudo que entrou e saiu, dia a dia", keywords: "gastos extrato movimentacoes" },
  { href: "/contas", label: "Contas", group: "Telas", description: "Bancos, carteira e reserva", keywords: "banco carteira saldo nubank" },
  { href: "/cartoes", label: "Cartões", group: "Telas", description: "Faturas, parcelas e limite dos cartões de crédito", keywords: "cartao credito fatura parcela limite pagar" },
  { href: "/mes#orcamento", label: "Orçamento", group: "Atalhos", description: "Limite de gasto por categoria no mês", keywords: "orcamento limite categoria teto gastos" },
  { href: "/planejar", label: "Planejar", group: "Telas", description: "Planos para conquistar algo ou sair de uma dívida", keywords: "metas objetivos planos" },
  { href: "/rotina", label: "Rotina · Hoje", group: "Telas", description: "Hábitos do dia, tarefas e lembretes", keywords: "habitos dia checklist" },
  { href: "/rotina?aba=tarefas", label: "Tarefas", group: "Telas", description: "Quadro de tarefas por prazo", keywords: "afazeres todo pendencias" },
  { href: "/rotina?aba=lembretes", label: "Lembretes", group: "Telas", description: "Lembretes com data e hora", keywords: "avisos alarme" },
  { href: "/rotina?aba=notas", label: "Notas", group: "Telas", description: "Seu bloco de notas", keywords: "anotacoes ideias bloco" },
  { href: "/registrar", label: "Registrar", group: "Telas", description: "Escreva do seu jeito e eu organizo", keywords: "chat lancar registro rapido" },
  { href: "/planejar/conquista", label: "Simular uma conquista", group: "Atalhos", description: "Quanto guardar por mês para comprar algo", keywords: "moto carro viagem juntar" },
  { href: "/planejar/divida", label: "Simular a saída de uma dívida", group: "Atalhos", description: "Compare parcelamentos e veja o que cabe", keywords: "cartao emprestimo parcelar" },
];

/** minúsculas e sem acentos */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Filtra os destinos: todas as palavras digitadas precisam aparecer. */
export function searchDestinations(query: string, list: readonly Destination[] = DESTINATIONS): Destination[] {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [...list];
  return list.filter((d) => {
    const haystack = normalizeSearch(`${d.label} ${d.description} ${d.keywords}`);
    return terms.every((t) => haystack.includes(t));
  });
}
