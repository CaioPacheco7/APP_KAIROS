import { describe, expect, it } from "vitest";
import {
  ALL_WEEKDAYS,
  currentStreak,
  isoWeekday,
  isScheduled,
  recentDays,
} from "./habits";

// Novembro de 2026: dia 9 = segunda, 13 = sexta, 14 = sábado, 15 = domingo
const TODAY = "2026-11-14"; // sábado
const set = (...dates: string[]) => new Set(dates);

describe("isoWeekday / isScheduled", () => {
  it("segunda = 1 ... domingo = 7", () => {
    expect(isoWeekday("2026-11-09")).toBe(1);
    expect(isoWeekday("2026-11-13")).toBe(5);
    expect(isoWeekday("2026-11-14")).toBe(6);
    expect(isoWeekday("2026-11-15")).toBe(7);
  });
  it("agenda por dia da semana", () => {
    expect(isScheduled([1, 3, 5], "2026-11-11")).toBe(true); // quarta
    expect(isScheduled([1, 3, 5], "2026-11-12")).toBe(false); // quinta
  });
});

describe("currentStreak (hábito diário)", () => {
  it("conta dias seguidos até hoje", () => {
    expect(currentStreak(ALL_WEEKDAYS, set("2026-11-14", "2026-11-13", "2026-11-12"), TODAY)).toBe(3);
  });
  it("hoje em aberto não quebra: continua pelo que veio antes", () => {
    expect(currentStreak(ALL_WEEKDAYS, set("2026-11-13", "2026-11-12"), TODAY)).toBe(2);
  });
  it("um dia previsto sem marcação quebra a sequência", () => {
    expect(currentStreak(ALL_WEEKDAYS, set("2026-11-14", "2026-11-13", "2026-11-11"), TODAY)).toBe(2);
  });
  it("nada marcado: zero", () => {
    expect(currentStreak(ALL_WEEKDAYS, set(), TODAY)).toBe(0);
  });
  it("ontem sem marcação e hoje feito: só hoje conta", () => {
    expect(currentStreak(ALL_WEEKDAYS, set("2026-11-14", "2026-11-12"), TODAY)).toBe(1);
  });
});

describe("currentStreak (só alguns dias da semana)", () => {
  const MWF = [1, 3, 5];
  it("dias fora da agenda não quebram nem contam", () => {
    // hoje é sábado (fora); sexta 13, quarta 11, segunda 9 feitos -> 3
    expect(currentStreak(MWF, set("2026-11-13", "2026-11-11", "2026-11-09"), TODAY)).toBe(3);
  });
  it("faltar num dia previsto quebra mesmo com dias de folga no meio", () => {
    // quarta 11 não foi feita -> só sexta 13 conta
    expect(currentStreak(MWF, set("2026-11-13", "2026-11-09"), TODAY)).toBe(1);
  });
  it("marcar num dia fora da agenda não conta", () => {
    expect(currentStreak(MWF, set("2026-11-14", "2026-11-12"), TODAY)).toBe(0);
  });
});

describe("recentDays", () => {
  it("monta os 7 dias com o status certo", () => {
    const days = recentDays([1, 2, 3, 4, 5], set("2026-11-13", "2026-11-11"), TODAY);
    expect(days.map((d) => d.date)).toEqual([
      "2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11",
      "2026-11-12", "2026-11-13", "2026-11-14",
    ]);
    expect(days.map((d) => d.status)).toEqual([
      "off",    // dom 8
      "missed", // seg 9
      "missed", // ter 10
      "done",   // qua 11
      "missed", // qui 12
      "done",   // sex 13
      "off",    // sáb 14 (hoje, mas fora da agenda)
    ]);
  });
  it("hoje previsto e sem marcação fica 'open'", () => {
    const days = recentDays(ALL_WEEKDAYS, set("2026-11-13"), TODAY, 2);
    expect(days.map((d) => d.status)).toEqual(["done", "open"]);
  });
  it("dias anteriores à criação do hábito não contam como falha", () => {
    const days = recentDays(ALL_WEEKDAYS, set("2026-11-14"), TODAY, 4, "2026-11-13");
    expect(days.map((d) => d.status)).toEqual(["off", "off", "missed", "done"]);
  });
});
