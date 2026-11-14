/**
 * Hábitos: dias da semana, sequência (streak) e histórico recente.
 * Funções puras; "hoje" e as datas vêm de quem chama (fuso de São Paulo).
 * Dias da semana no padrão ISO: 1 = segunda ... 7 = domingo.
 */

import { addDays } from "@/lib/dates";

export const WEEKDAY_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;
export const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

/** "2026-11-14" -> 6 (sábado) */
export function isoWeekday(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  return js === 0 ? 7 : js;
}

export function isScheduled(weekdays: number[], iso: string): boolean {
  return weekdays.includes(isoWeekday(iso));
}

/** done: o hábito foi feito · missed: dia previsto sem marcação · off: não era para fazer · open: hoje, ainda em aberto */
export type DayStatus = "done" | "missed" | "off" | "open";

/**
 * Últimos `n` dias terminando em `today` (do mais antigo ao mais novo).
 * `createdOn` evita contar como "falha" os dias anteriores à criação do hábito.
 */
export function recentDays(
  weekdays: number[],
  done: Set<string>,
  today: string,
  n = 7,
  createdOn?: string,
): Array<{ date: string; status: DayStatus }> {
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(today, -(n - 1 - i));
    let status: DayStatus;
    if (createdOn && date < createdOn) status = done.has(date) ? "done" : "off";
    else if (!isScheduled(weekdays, date)) status = "off";
    else if (done.has(date)) status = "done";
    else if (date === today) status = "open";
    else status = "missed";
    return { date, status };
  });
}

/**
 * Sequência atual: dias previstos seguidos em que o hábito foi feito.
 * Dias fora da agenda não quebram nem contam. O dia de hoje ainda em aberto
 * não quebra a sequência (só quebra quando o dia passa sem marcação).
 */
export function currentStreak(
  weekdays: number[],
  done: Set<string>,
  today: string,
  maxDays = 400,
): number {
  let streak = 0;
  for (let i = 0; i < maxDays; i++) {
    const date = addDays(today, -i);
    if (!isScheduled(weekdays, date)) continue;
    if (done.has(date)) {
      streak++;
      continue;
    }
    if (i === 0) continue; // hoje ainda dá tempo
    break;
  }
  return streak;
}
