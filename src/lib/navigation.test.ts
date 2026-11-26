import { describe, expect, it } from "vitest";
import {
  DESTINATIONS,
  MODULES,
  SCENES,
  activeSubId,
  moduleFor,
  normalizeSearch,
  routineTab,
  sceneFor,
  searchDestinations,
  subnavFor,
} from "./navigation";
import { isFinancePath } from "./sections";

describe("moduleFor: em que módulo está cada tela", () => {
  it.each([
    ["/", "inicio"],
    ["/dashboard", "financas"],
    ["/mes", "financas"],
    ["/planejar/divida", "financas"],
    ["/financas", "financas"],
    ["/rotina", "rotina"],
    ["/registrar", "registrar"],
    ["/qualquer-outra", "inicio"],
  ] as const)("%s → %s", (path, expected) => {
    expect(moduleFor(path)).toBe(expected);
  });

  it("não confunde prefixos (/rotinas não é a Rotina)", () => {
    expect(moduleFor("/rotinas")).toBe("inicio");
    expect(moduleFor("/registrarx")).toBe("inicio");
  });
});

describe("cenas de fundo", () => {
  it("cada módulo tem uma cena existente, e Finanças tem a sua própria", () => {
    for (const m of MODULES) expect(SCENES[m.scene]).toBeDefined();
    expect(sceneFor("/dashboard")).toBe("horizonte");
    expect(sceneFor("/rotina")).toBe("rotina");
    expect(sceneFor("/")).toBe("casa");
  });

  it("o brilho da foto fica num intervalo seguro", () => {
    for (const s of Object.values(SCENES)) {
      expect(s.bright.light).toBeGreaterThan(0.6);
      expect(s.bright.light).toBeLessThanOrEqual(1.1);
      expect(s.bright.dark).toBeLessThan(s.bright.light);
    }
  });
});

describe("abas dos módulos (docas)", () => {
  it("Finanças lista as cinco telas, todas dentro de Finanças", () => {
    const items = subnavFor("financas");
    expect(items.map((i) => i.href)).toEqual(["/dashboard", "/mes", "/transacoes", "/contas", "/planejar"]);
    for (const i of items) expect(isFinancePath(i.href)).toBe(true);
  });

  it("Rotina usa ?aba= e a aba Hoje é a própria /rotina", () => {
    expect(subnavFor("rotina").map((i) => i.href)).toEqual([
      "/rotina",
      "/rotina?aba=tarefas",
      "/rotina?aba=lembretes",
      "/rotina?aba=notas",
    ]);
  });

  it("Início e Registrar não têm abas", () => {
    expect(subnavFor("inicio")).toEqual([]);
    expect(subnavFor("registrar")).toEqual([]);
  });

  it("marca a aba ativa", () => {
    expect(activeSubId("financas", "/planejar/conquista", null)).toBe("planejar");
    expect(activeSubId("financas", "/financas", null)).toBe("dashboard");
    expect(activeSubId("rotina", "/rotina", "notas")).toBe("notas");
    expect(activeSubId("rotina", "/rotina", null)).toBe("hoje");
    expect(activeSubId("inicio", "/", null)).toBeNull();
  });

  it("?aba= inválida vira Hoje", () => {
    expect(routineTab("xyz")).toBe("hoje");
    expect(routineTab(["tarefas", "notas"])).toBe("tarefas");
    expect(routineTab(undefined)).toBe("hoje");
  });
});

describe("busca da paleta", () => {
  it("ignora acentos e maiúsculas", () => {
    expect(normalizeSearch("  Transações ")).toBe("transacoes");
  });

  it("sem texto, mostra todos os destinos", () => {
    expect(searchDestinations("")).toHaveLength(DESTINATIONS.length);
  });

  it("encontra por nome, descrição ou palavra-chave, exigindo todas as palavras", () => {
    expect(searchDestinations("transacoes").map((d) => d.href)).toContain("/transacoes");
    expect(searchDestinations("moto").map((d) => d.href)).toContain("/planejar/conquista");
    expect(searchDestinations("contas fixas").map((d) => d.href)).toEqual(["/mes"]);
    expect(searchDestinations("palavra-que-nao-existe")).toEqual([]);
  });
});
