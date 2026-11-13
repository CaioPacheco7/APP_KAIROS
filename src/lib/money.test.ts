import { describe, expect, it } from "vitest";
import { centsToInput, formatBRL, parseMoneyToCents } from "./money";

describe("parseMoneyToCents", () => {
  it.each([
    ["10", 1000],
    ["10,5", 1050],
    ["10,50", 1050],
    ["1234,56", 123456],
    ["1.234,56", 123456],
    ["1234.56", 123456],
    ["12.5", 1250],
    ["12.50", 1250],
    ["1.234", 123400], // milhar
    ["1.234.567", 123456700],
    ["R$ 99,90", 9990],
    ["0,01", 1],
    ["0", 0],
  ])("%s -> %i centavos", (input, expected) => {
    expect(parseMoneyToCents(input)).toBe(expected);
  });

  it.each(["", "abc", "10,555", "1,2,3", "--5", "10,", ",50", "1e3"])(
    "rejeita %j",
    (input) => {
      expect(parseMoneyToCents(input)).toBeNull();
    },
  );

  it("rejeita negativo por padrão e aceita quando permitido", () => {
    expect(parseMoneyToCents("-10,00")).toBeNull();
    expect(parseMoneyToCents("-10,00", { allowNegative: true })).toBe(-1000);
  });

  it("rejeita números grandes demais para inteiro seguro", () => {
    expect(parseMoneyToCents("999999999999999999")).toBeNull();
  });
});

describe("centsToInput", () => {
  it("round-trip com parseMoneyToCents", () => {
    for (const cents of [0, 1, 99, 100, 123456, -5050]) {
      expect(
        parseMoneyToCents(centsToInput(cents), { allowNegative: true }),
      ).toBe(cents);
    }
  });
});

describe("formatBRL", () => {
  it("formata em reais", () => {
    // Intl usa espaço não separável entre R$ e o valor
    expect(formatBRL(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
    expect(formatBRL(0).replace(/\s/g, " ")).toBe("R$ 0,00");
  });
});
