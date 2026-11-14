import { describe, expect, it } from "vitest";
import { FINANCE_SUBNAV, isFinancePath } from "./sections";

describe("isFinancePath: só Finanças exige a entrevista", () => {
  it.each([
    "/financas",
    "/dashboard",
    "/mes",
    "/transacoes",
    "/transacoes/qualquer-coisa",
    "/contas",
    "/planejar",
    "/planejar/conquista",
    "/planejar/divida",
  ])("%s é Finanças", (path) => {
    expect(isFinancePath(path)).toBe(true);
  });

  it.each([
    "/", // Início
    "/rotina",
    "/rotina/qualquer",
    "/registrar",
    "/entrar",
    "/entrevista", // a própria entrevista não pode exigir a entrevista
    "/entrevista/verificar",
    "/auth/callback",
  ])("%s NÃO é Finanças", (path) => {
    expect(isFinancePath(path)).toBe(false);
  });

  it("respeita o limite do prefixo (não confunde /mes com /mesa)", () => {
    expect(isFinancePath("/mesa")).toBe(false);
    expect(isFinancePath("/contas-extras")).toBe(false);
    expect(isFinancePath("/dashboards")).toBe(false);
  });

  it("todo item da sub-navegação pertence a Finanças", () => {
    for (const item of FINANCE_SUBNAV) {
      expect(isFinancePath(item.href)).toBe(true);
    }
  });
});
