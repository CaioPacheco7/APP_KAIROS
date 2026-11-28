/**
 * Lembretes fixos (RN-40): repetem nos dias escolhidos (1 = segunda ...
 * 7 = domingo), num horário. Puro e testável.
 */

export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export const WORK_DAYS = [1, 2, 3, 4, 5] as const;
export const WEEKEND = [6, 7] as const;

export type RepeatPreset = "once" | "daily" | "weekdays" | "custom";

const SHORT = ["", "seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

const same = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

/** Dias normalizados: sem repetidos, ordenados, só 1..7. */
export function normalizeDays(days: readonly number[]): number[] {
  return [...new Set(days.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort((a, b) => a - b);
}

/** "todo dia", "dias úteis", "fim de semana", "seg, qua e sex" */
export function daysLabel(days: readonly number[]): string {
  const d = normalizeDays(days);
  if (same(d, ALL_DAYS)) return "todo dia";
  if (same(d, WORK_DAYS)) return "dias úteis";
  if (same(d, WEEKEND)) return "fim de semana";
  const names = d.map((x) => SHORT[x]);
  return names.length === 1 ? `toda ${names[0]}` : `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
}

/** "todo dia às 10:00" */
export function repeatLabel(days: readonly number[], time: string): string {
  return `${daysLabel(days)} às ${time.slice(0, 5)}`;
}

/** Qual predefinição corresponde a estes dias (para preencher o formulário). */
export function presetFor(days: readonly number[] | null): RepeatPreset {
  if (!days) return "once";
  const d = normalizeDays(days);
  if (same(d, ALL_DAYS)) return "daily";
  if (same(d, WORK_DAYS)) return "weekdays";
  return "custom";
}

export function daysForPreset(preset: RepeatPreset, custom: readonly number[] = []): number[] | null {
  if (preset === "daily") return [...ALL_DAYS];
  if (preset === "weekdays") return [...WORK_DAYS];
  if (preset === "custom") return normalizeDays(custom);
  return null;
}

// ---------------------------------------------------------------------
// Entender a repetição num texto ("todo dia às 10h beber água")
// ---------------------------------------------------------------------

const DAY_WORDS: Array<[number, string]> = [
  [1, "segunda"], [2, "terca"], [3, "quarta"], [4, "quinta"], [5, "sexta"], [6, "sabado"], [7, "domingo"],
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Procura uma repetição no texto e a remove. Entende "todo dia", "todos os
 * dias", "diariamente", "dias úteis", "de segunda a sexta", "fim de semana",
 * "toda segunda", "toda terça e quinta".
 */
export function extractRepeat(text: string): { days: number[] | null; rest: string } {
  const n = norm(text);
  const cut = (re: RegExp) => {
    const m = n.match(re);
    if (!m || m.index === undefined) return text;
    return (text.slice(0, m.index) + " " + text.slice(m.index + m[0].length)).replace(/\s+/g, " ").trim();
  };

  const daily = /\b(todos? os dias|todo dia|diariamente)\b/;
  if (daily.test(n)) return { days: [...ALL_DAYS], rest: cut(daily) };

  const work = /\b(em )?(dias? uteis|de segunda a sexta(-feira)?)\b/;
  if (work.test(n)) return { days: [...WORK_DAYS], rest: cut(work) };

  const weekend = /\b(no |nos |todo )?(fim|fins|final|finais) de semana\b/;
  if (weekend.test(n)) return { days: [...WEEKEND], rest: cut(weekend) };

  // "toda segunda", "todas as segundas e quartas", "toda terça-feira e quinta"
  const list = /\btod[oa]s?\s+(?:as\s+|os\s+)?((?:(?:segunda|terca|quarta|quinta|sexta|sabado|domingo)s?(?:-feiras?)?(?:\s*(?:,|e)\s*)?)+)/;
  const m = n.match(list);
  if (m) {
    const days = DAY_WORDS.filter(([, w]) => m[1].includes(w)).map(([d]) => d);
    if (days.length) return { days, rest: cut(list) };
  }
  return { days: null, rest: text };
}
