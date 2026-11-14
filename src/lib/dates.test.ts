import { describe, expect, it } from "vitest";
import {
  currentMonth,
  greetingForHour,
  hourInSaoPaulo,
  isISODate,
  lastMonths,
  monthBounds,
  monthLabel,
  parseMonth,
  shiftMonth,
  todayISO,
} from "./dates";

describe("todayISO (fuso de São Paulo)", () => {
  it("meia-noite UTC ainda é o dia anterior em São Paulo", () => {
    // 2026-11-14 02:00 UTC = 2026-11-13 23:00 em São Paulo (UTC-3)
    expect(todayISO(new Date("2026-11-14T02:00:00Z"))).toBe("2026-11-13");
  });
  it("durante o dia coincide", () => {
    expect(todayISO(new Date("2026-11-13T15:00:00Z"))).toBe("2026-11-13");
  });
  it("currentMonth", () => {
    expect(currentMonth(new Date("2026-12-01T01:00:00Z"))).toBe("2026-11");
  });
});

describe("shiftMonth", () => {
  it.each([
    ["2026-11", 1, "2026-12"],
    ["2026-12", 1, "2027-01"],
    ["2026-01", -1, "2025-12"],
    ["2026-03", -15, "2024-12"],
    ["2026-11", 0, "2026-11"],
  ])("%s %i -> %s", (m, d, expected) => {
    expect(shiftMonth(m, d)).toBe(expected);
  });
});

describe("monthBounds / lastMonths / parseMonth", () => {
  it("intervalo semiaberto do mês", () => {
    expect(monthBounds("2026-12")).toEqual({
      start: "2026-12-01",
      end: "2027-01-01",
    });
  });
  it("lastMonths vai do mais antigo ao mais novo", () => {
    expect(lastMonths("2026-02", 4)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
  it("parseMonth valida e usa fallback", () => {
    expect(parseMonth("2026-05", "2026-11")).toBe("2026-05");
    expect(parseMonth("2026-13", "2026-11")).toBe("2026-11");
    expect(parseMonth("lixo", "2026-11")).toBe("2026-11");
    expect(parseMonth(undefined, "2026-11")).toBe("2026-11");
    expect(parseMonth(["2026-01", "x"], "2026-11")).toBe("2026-01");
  });
  it("monthLabel em português", () => {
    expect(monthLabel("2026-11")).toBe("novembro de 2026");
  });
});

describe("isISODate", () => {
  it("aceita datas reais e recusa inexistentes", () => {
    expect(isISODate("2026-11-13")).toBe(true);
    expect(isISODate("2028-02-29")).toBe(true);
    expect(isISODate("2026-02-29")).toBe(false);
    expect(isISODate("2026-13-01")).toBe(false);
    expect(isISODate("13/11/2026")).toBe(false);
  });
});

describe("saudação por horário (São Paulo)", () => {
  it("hora em São Paulo, não em UTC", () => {
    // 2026-11-14 02:00 UTC = 23:00 em São Paulo
    expect(hourInSaoPaulo(new Date("2026-11-14T02:00:00Z"))).toBe(23);
    expect(hourInSaoPaulo(new Date("2026-11-14T12:30:00Z"))).toBe(9);
    expect(hourInSaoPaulo(new Date("2026-11-14T03:00:00Z"))).toBe(0); // meia-noite, não "24"
  });
  it.each([
    [0, "Boa noite"], [4, "Boa noite"], [5, "Bom dia"], [11, "Bom dia"],
    [12, "Boa tarde"], [17, "Boa tarde"], [18, "Boa noite"], [23, "Boa noite"],
  ])("%ih -> %s", (hour, expected) => {
    expect(greetingForHour(hour)).toBe(expected);
  });
});
