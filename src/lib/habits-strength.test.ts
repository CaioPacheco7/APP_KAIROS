import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import {
  ALL_WEEKDAYS,
  habitStrength,
  habitYear,
  isoWeekday,
  STRENGTH_HALF_LIFE,
  strengthLabel,
  yearByMonth,
  yearLevel,
} from "./habits";

const TODAY = "2026-11-26"; // quinta-feira
/** As `n` datas terminando em `end` (inclusive). */
const lastDays = (end: string, n: number) => Array.from({ length: n }, (_, i) => addDays(end, -i));

describe("habitStrength (força do hábito)", () => {
  it("começa em zero e cresce com a constância", () => {
    expect(habitStrength(ALL_WEEKDAYS, new Set(), TODAY)).toBe(0);
    const week = habitStrength(ALL_WEEKDAYS, new Set(lastDays(TODAY, 7)), TODAY);
    const month = habitStrength(ALL_WEEKDAYS, new Set(lastDays(TODAY, 30)), TODAY);
    expect(week).toBeGreaterThan(0.25);
    expect(month).toBeGreaterThan(week);
    expect(month).toBeLessThan(1);
  });

  it("depois de uma meia-vida de dias feitos, chega na metade", () => {
    const s = habitStrength(ALL_WEEKDAYS, new Set(lastDays(TODAY, STRENGTH_HALF_LIFE)), TODAY);
    expect(s).toBeCloseTo(0.5, 5);
  });

  it("uma falta baixa a força, mas não zera (a sequência zeraria)", () => {
    const done = new Set(lastDays(addDays(TODAY, -1), 60));
    const before = habitStrength(ALL_WEEKDAYS, done, addDays(TODAY, -1));
    done.delete(addDays(TODAY, -1));
    const after = habitStrength(ALL_WEEKDAYS, done, addDays(TODAY, -1));
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(before * 0.9);
  });

  it("hoje em aberto não derruba; dias fora da agenda não contam", () => {
    const yesterday = addDays(TODAY, -1);
    const done = new Set(lastDays(yesterday, 20));
    expect(habitStrength(ALL_WEEKDAYS, done, TODAY)).toBe(habitStrength(ALL_WEEKDAYS, done, yesterday));

    // só às segundas: os outros dias da semana não mudam nada
    const mondays = lastDays(TODAY, 60).filter((d) => isoWeekday(d) === 1);
    const onlyMondays = habitStrength([1], new Set(mondays), TODAY);
    expect(onlyMondays).toBeCloseTo(1 - Math.pow(0.5, mondays.length / STRENGTH_HALF_LIFE), 5);
  });

  it("antes de criar o hábito não conta como falta", () => {
    const created = addDays(TODAY, -4);
    const done = new Set(lastDays(TODAY, 5));
    expect(habitStrength(ALL_WEEKDAYS, done, TODAY, created)).toBeCloseTo(1 - Math.pow(0.5, 5 / STRENGTH_HALF_LIFE), 5);
  });

  it("nome da fase", () => {
    expect(strengthLabel(0.1)).toBe("começando");
    expect(strengthLabel(0.3)).toBe("pegando ritmo");
    expect(strengthLabel(0.6)).toBe("firme");
    expect(strengthLabel(0.9)).toBe("consolidado");
  });
});

describe("habitYear (mapa do ano)", () => {
  const daily = { weekdays: ALL_WEEKDAYS, createdOn: "2026-01-01" };

  it("monta semanas de segunda a domingo, terminando na semana de hoje", () => {
    const weeks = habitYear([{ ...daily, done: new Set() }], TODAY, 53);
    expect(weeks).toHaveLength(53);
    const last = weeks.at(-1)!;
    expect(last.days[0]?.date).toBe("2026-11-23"); // segunda
    expect(last.days[3]?.date).toBe(TODAY); // quinta
    expect(last.days[4]).toBeNull(); // sexta ainda não chegou
    expect(isoWeekday(weeks[0].days[0]!.date)).toBe(1);
  });

  it("conta previstos e feitos por dia, respeitando a agenda e a criação", () => {
    const weeks = habitYear(
      [
        { ...daily, done: new Set([TODAY]) },
        { weekdays: [4], createdOn: "2026-01-01", done: new Set() }, // só quinta
        { weekdays: ALL_WEEKDAYS, createdOn: TODAY, done: new Set([TODAY]) },
      ],
      TODAY,
      2,
    );
    const thursday = weeks[1].days[3]!;
    expect(thursday).toEqual({ date: TODAY, scheduled: 3, done: 2 });
    const wednesday = weeks[1].days[2]!;
    expect(wednesday).toMatchObject({ scheduled: 1, done: 0 }); // o 3º ainda não existia
  });

  it("marca a semana em que cada mês começa", () => {
    const weeks = habitYear([{ ...daily, done: new Set() }], TODAY, 6);
    const starts = weeks.filter((w) => w.monthStart).map((w) => w.monthStart);
    expect(starts).toEqual(["2026-10", "2026-11"]); // 1ª coluna + semana do dia 1º/11
  });

  it("nível de cada dia e resumo por mês", () => {
    expect(yearLevel({ date: TODAY, scheduled: 0, done: 0 })).toBeNull();
    expect(yearLevel({ date: TODAY, scheduled: 3, done: 0 })).toBe(0);
    expect(yearLevel({ date: TODAY, scheduled: 4, done: 1 })).toBe(1);
    expect(yearLevel({ date: TODAY, scheduled: 3, done: 1 })).toBe(2);
    expect(yearLevel({ date: TODAY, scheduled: 3, done: 2 })).toBe(3);
    expect(yearLevel({ date: TODAY, scheduled: 3, done: 3 })).toBe(4);

    const weeks = habitYear([{ ...daily, done: new Set(["2026-11-25", TODAY]) }], TODAY, 1);
    expect(yearByMonth(weeks)).toEqual([
      { month: "2026-11", activeDays: 4, perfectDays: 2, scheduled: 4, done: 2 },
    ]);
  });
});
