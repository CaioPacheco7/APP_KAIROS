/**
 * Datas do KAIROS. "Hoje" e "mês" são sempre no fuso do usuário
 * (America/Sao_Paulo), nunca o do servidor. (RN-17)
 * Datas de transação são strings ISO "YYYY-MM-DD"; meses são "YYYY-MM".
 */

export const TIMEZONE = "America/Sao_Paulo";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/** Data de hoje no fuso de São Paulo: "2026-11-13". */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function currentMonth(now: Date = new Date()): string {
  return todayISO(now).slice(0, 7);
}

/** Valida o parâmetro ?mes=; se inválido, usa o fallback. */
export function parseMonth(
  param: string | string[] | undefined,
  fallback: string,
): string {
  const value = Array.isArray(param) ? param[0] : param;
  return value && MONTH_RE.test(value) ? value : fallback;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  const year = Math.floor(index / 12);
  const mon = (index % 12) + 1;
  return `${year}-${String(mon).padStart(2, "0")}`;
}

/** Intervalo [start, end) do mês: ambos "YYYY-MM-DD". */
export function monthBounds(month: string): { start: string; end: string } {
  return { start: `${month}-01`, end: `${shiftMonth(month, 1)}-01` };
}

/** Últimos n meses terminando em `month`, do mais antigo ao mais novo. */
export function lastMonths(month: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => shiftMonth(month, i - (n - 1)));
}

/** "2026-11" -> "novembro de 2026" */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** "2026-11" -> "nov" */
export function monthShort(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", month: "short" })
    .format(new Date(Date.UTC(y, m - 1, 1)))
    .replace(".", "");
}

/** "2026-11-13" -> "13/11/2026" */
export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** "2026-11-13" -> "13/11" */
export function formatDayMonth(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** Soma dias a uma data ISO (sem depender de fuso). */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** "2026-11-14T12:00:00Z" -> "09:00" (hora no fuso de São Paulo) */
export function formatTimeBR(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoTimestamp));
}
