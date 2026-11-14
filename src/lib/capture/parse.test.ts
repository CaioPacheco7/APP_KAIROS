import { describe, expect, it } from "vitest";
import {
  categoryHintFor,
  extractAmount,
  extractDate,
  extractTime,
  parseCapture,
} from "./parse";

const TODAY = "2026-11-13"; // sexta-feira

describe("despesas", () => {
  it("o exemplo do Caio: café na padaria", () => {
    expect(
      parseCapture("hoje tomei um café na padaria, R$ 50", TODAY),
    ).toEqual({
      kind: "transaction",
      type: "expense",
      amount: 5000,
      date: TODAY,
      description: "Tomei um café na padaria",
      categoryHint: "Alimentação fora",
    });
  });

  it("valor solto no fim", () => {
    const r = parseCapture("uber 23,90", TODAY);
    expect(r).toMatchObject({
      kind: "transaction",
      type: "expense",
      amount: 2390,
      categoryHint: "Transporte",
      description: "Uber",
    });
  });

  it("'reais' e data relativa", () => {
    const r = parseCapture("paguei 120 reais de luz ontem", TODAY);
    expect(r).toMatchObject({
      kind: "transaction",
      type: "expense",
      amount: 12000,
      date: "2026-11-12",
      categoryHint: "Contas e taxas",
    });
  });

  it("data dd/mm não vira valor", () => {
    const r = parseCapture("mercado 245,80 dia 10/11", TODAY);
    expect(r).toMatchObject({
      kind: "transaction",
      amount: 24580,
      date: "2026-11-10",
      categoryHint: "Mercado",
    });
  });

  it("'dia N' é o mês atual", () => {
    const r = parseCapture("aluguel 1.500 dia 5", TODAY);
    expect(r).toMatchObject({
      amount: 150000,
      date: "2026-11-05",
      categoryHint: "Moradia",
    });
  });

  it("sem categoria conhecida: categoryHint nulo, descrição do texto", () => {
    const r = parseCapture("comprei um negócio estranho 15", TODAY);
    expect(r).toMatchObject({ kind: "transaction", amount: 1500, categoryHint: null });
  });
});

describe("receitas", () => {
  it("salário", () => {
    expect(parseCapture("recebi 3000 de salário", TODAY)).toMatchObject({
      kind: "transaction",
      type: "income",
      amount: 300000,
      categoryHint: "Salário",
    });
  });

  it("freela", () => {
    expect(parseCapture("ganhei R$ 800,00 de freela", TODAY)).toMatchObject({
      type: "income",
      amount: 80000,
      categoryHint: "Renda extra",
    });
  });

  it("receita sem categoria específica", () => {
    expect(parseCapture("me pagaram 200", TODAY)).toMatchObject({
      type: "income",
      categoryHint: "Outras receitas",
    });
  });
});

describe("rotina", () => {
  it("nota", () => {
    expect(parseCapture("anotar: ideia de presente para a Ana", TODAY)).toEqual({
      kind: "note",
      text: "ideia de presente para a Ana",
    });
  });

  it("tarefa com prazo (futuro)", () => {
    expect(parseCapture("tarefa: renovar CNH até 20/12", TODAY)).toEqual({
      kind: "task",
      title: "Renovar CNH",
      dueDate: "2026-12-20",
    });
  });

  it("tarefa: dd/mm que já passou vai para o próximo ano", () => {
    expect(parseCapture("tarefa: declarar imposto 05/03", TODAY)).toMatchObject({
      dueDate: "2027-03-05",
    });
  });

  it("lembrete com dia e hora", () => {
    expect(parseCapture("lembrar de pagar a luz amanhã 9h", TODAY)).toEqual({
      kind: "reminder",
      title: "Pagar a luz",
      date: "2026-11-14",
      time: "09:00",
    });
  });

  it("lembrete sem data é para hoje", () => {
    expect(parseCapture("lembrete: ligar para o banco às 15:30", TODAY)).toEqual({
      kind: "reminder",
      title: "Ligar para o banco",
      date: TODAY,
      time: "15:30",
    });
  });
});

describe("entradas que não dá para entender", () => {
  it.each(["", "   ", "oi tudo bem", "gastei muito hoje"])(
    "%j -> unknown",
    (text) => {
      expect(parseCapture(text, TODAY).kind).toBe("unknown");
    },
  );

  it("valor zero", () => {
    expect(parseCapture("gastei 0", TODAY).kind).toBe("unknown");
  });

  it("prefixo sem conteúdo", () => {
    expect(parseCapture("anotar:", TODAY).kind).toBe("unknown");
    expect(parseCapture("tarefa", TODAY).kind).toBe("unknown");
    expect(parseCapture("lembrar de", TODAY).kind).toBe("unknown");
  });
});

describe("categoryHintFor (contas fixas da entrevista)", () => {
  it.each([
    ["Água", "expense", "Contas e taxas"],
    ["Luz", "expense", "Contas e taxas"],
    ["Consórcio da moto", "expense", "Outras despesas"],
    ["Alimentação", "expense", "Mercado"],
    ["Aluguel", "expense", "Moradia"],
    ["Netflix", "expense", "Assinaturas"],
    ["Salário", "income", "Salário"],
    ["Coisa sem pista", "expense", null],
  ] as const)("%s (%s) -> %s", (text, type, expected) => {
    expect(categoryHintFor(text, type)).toBe(expected);
  });
});

describe("extratores", () => {
  it("extractAmount prioriza R$ e 'reais' sobre números soltos", () => {
    expect(extractAmount("2 cafés R$ 10").amount).toBe(1000);
    expect(extractAmount("2 cafés 10 reais").amount).toBe(1000);
    expect(extractAmount("pizza 59,90").amount).toBe(5990);
    expect(extractAmount("sem número").amount).toBeNull();
  });

  it("extractAmount tolera ponto final", () => {
    expect(extractAmount("paguei R$ 50.").amount).toBe(5000);
  });

  it("extractDate", () => {
    expect(extractDate("depois de amanhã", TODAY).date).toBe("2026-11-15");
    expect(extractDate("anteontem", TODAY).date).toBe("2026-11-11");
    expect(extractDate("dia 31", "2026-11-13").date).toBeNull(); // novembro tem 30
    expect(extractDate("nada aqui", TODAY).date).toBeNull();
  });

  it("extractTime", () => {
    expect(extractTime("às 9").time).toBe("09:00");
    expect(extractTime("15h30").time).toBe("15:30");
    expect(extractTime("25h").time).toBeNull();
    expect(extractTime("sem hora").time).toBeNull();
  });
});
