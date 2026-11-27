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

/** Depois de 13 dias previstos sem fazer, a força cai pela metade (e sobe no mesmo ritmo). */
export const STRENGTH_HALF_LIFE = 13;
const DECAY = Math.pow(0.5, 1 / STRENGTH_HALF_LIFE);

/**
 * Força do hábito, de 0 a 1 (ideia do Loop Habit Tracker): uma média que dá
 * mais peso aos dias recentes. Cada dia previsto feito puxa a força para cima
 * e cada falta puxa para baixo, sem zerar o que foi construído (ao contrário
 * da sequência). Dias fora da agenda não contam; hoje só conta se já foi feito.
 */
export function habitStrength(
  weekdays: number[],
  done: Set<string>,
  today: string,
  createdOn?: string,
  maxDays = 400,
): number {
  const earliest = addDays(today, -(maxDays - 1));
  let score = 0;
  for (let date = createdOn && createdOn > earliest ? createdOn : earliest; date <= today; date = addDays(date, 1)) {
    if (!isScheduled(weekdays, date)) continue;
    const hit = done.has(date);
    if (date === today && !hit) continue;
    score = score * DECAY + (hit ? 1 - DECAY : 0);
  }
  return score;
}

/** Nome da fase, para a força nunca depender só do número. */
export function strengthLabel(strength: number): string {
  if (strength >= 0.75) return "consolidado";
  if (strength >= 0.5) return "firme";
  if (strength >= 0.25) return "pegando ritmo";
  return "começando";
}

export type YearDay = {
  date: string;
  /** hábitos previstos neste dia (que já existiam) */
  scheduled: number;
  /** quantos deles foram feitos */
  done: number;
};

export type YearWeek = {
  /** segunda a domingo; null = dia que ainda não chegou */
  days: Array<YearDay | null>;
  /** "2026-11" quando um mês começa nesta semana */
  monthStart?: string;
};

type HabitHistory = { weekdays: number[]; done: Set<string>; createdOn: string };

/**
 * Mapa do ano: `weeks` semanas (segunda a domingo) terminando na semana de
 * hoje, com quantos hábitos estavam previstos e quantos foram feitos em cada dia.
 */
export function habitYear(habits: HabitHistory[], today: string, weeks = 53): YearWeek[] {
  const monday = addDays(today, -(isoWeekday(today) - 1));
  const first = addDays(monday, -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) => {
    let monthStart: string | undefined;
    const days = Array.from({ length: 7 }, (_, d) => {
      const date = addDays(first, w * 7 + d);
      if (date.endsWith("-01") || (w === 0 && d === 0)) monthStart = date.slice(0, 7);
      if (date > today) return null;
      let scheduled = 0;
      let done = 0;
      for (const h of habits) {
        if (date < h.createdOn || !isScheduled(h.weekdays, date)) continue;
        scheduled++;
        if (h.done.has(date)) done++;
      }
      return { date, scheduled, done };
    });
    return { days, monthStart };
  });
}

/** Intensidade de um dia no mapa: 0 = nada feito ... 4 = tudo feito; null = nada previsto. */
export function yearLevel(day: YearDay): 0 | 1 | 2 | 3 | 4 | null {
  if (day.scheduled === 0) return null;
  const ratio = day.done / day.scheduled;
  if (ratio >= 1) return 4;
  if (ratio >= 2 / 3) return 3;
  if (ratio >= 1 / 3) return 2;
  return ratio > 0 ? 1 : 0;
}

/** Resumo por mês do mapa (para a tabela acessível e o texto de apoio). */
export function yearByMonth(weeks: YearWeek[]): Array<{
  month: string;
  activeDays: number;
  perfectDays: number;
  scheduled: number;
  done: number;
}> {
  const byMonth = new Map<string, { activeDays: number; perfectDays: number; scheduled: number; done: number }>();
  for (const week of weeks) {
    for (const day of week.days) {
      if (!day || day.scheduled === 0) continue;
      const key = day.date.slice(0, 7);
      const row = byMonth.get(key) ?? { activeDays: 0, perfectDays: 0, scheduled: 0, done: 0 };
      row.activeDays++;
      if (day.done === day.scheduled) row.perfectDays++;
      row.scheduled += day.scheduled;
      row.done += day.done;
      byMonth.set(key, row);
    }
  }
  return [...byMonth.entries()].map(([month, row]) => ({ month, ...row }));
}
