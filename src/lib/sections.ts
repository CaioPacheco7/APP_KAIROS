/**
 * Seções do app. Finanças é um módulo opcional: só quem entra nele passa pela
 * entrevista inicial. Rotina, notas e o chat de registro funcionam sem ela.
 */

/** Telas do módulo Finanças. */
export const FINANCE_PATHS = [
  "/financas",
  "/dashboard",
  "/mes",
  "/transacoes",
  "/contas",
  "/planejar",
] as const;

const startsWithPath = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

/** O caminho pertence ao módulo Finanças? */
export function isFinancePath(pathname: string): boolean {
  return FINANCE_PATHS.some((p) => startsWithPath(pathname, p));
}

/** Navegação interna de Finanças (a entrada "/financas" só redireciona). */
export const FINANCE_SUBNAV = [
  { href: "/dashboard", label: "Visão geral" },
  { href: "/mes", label: "Meu mês" },
  { href: "/transacoes", label: "Transações" },
  { href: "/contas", label: "Contas" },
  { href: "/planejar", label: "Planejar" },
] as const;
