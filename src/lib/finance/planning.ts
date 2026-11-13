/**
 * Simuladores de planejamento: conquistar algo (meta) e sair de uma dívida.
 * Funções puras. Tudo em CENTAVOS. Taxas informadas pela pessoa (ao mês);
 * nada aqui é recomendação de investimento: são simulações transparentes.
 */

import { formatBRL } from "@/lib/money";

const MAX_MONTHS = 1200; // 100 anos: teto de segurança dos laços

/** 1,5 (%) -> 0.015. Nulo, negativo ou inválido vira 0. */
export function toRate(pct: number | null | undefined): number {
  return pct && Number.isFinite(pct) && pct > 0 ? pct / 100 : 0;
}

// ---------------------------------------------------------------------
// Matemática financeira básica
// ---------------------------------------------------------------------

/** Parcela fixa (tabela Price) para quitar `principal` em `n` meses, juros `r` ao mês. */
export function installment(principal: number, r: number, n: number): number {
  if (n <= 0) return principal;
  if (r === 0) return Math.ceil(principal / n);
  return Math.ceil((principal * r) / (1 - Math.pow(1 + r, -n)));
}

/**
 * Simula o pagamento mensal fixo de uma dívida. A última parcela é menor.
 * Retorna null se a parcela não cobre nem os juros (a dívida nunca acaba).
 */
export function simulatePayoff(
  debt: number,
  r: number,
  payment: number,
): { months: number; total: number } | null {
  if (payment <= 0) return null;
  if (r > 0 && payment <= debt * r) return null;

  let balance = debt;
  let total = 0;
  for (let month = 1; month <= MAX_MONTHS; month++) {
    balance += Math.round(balance * r);
    const pay = Math.min(payment, balance);
    total += pay;
    balance -= pay;
    if (balance <= 0) return { months: month, total };
  }
  return null;
}

/** Quantos meses guardando `deposit` por mês (rendendo `r` ao mês) até chegar em `target`. */
export function monthsToReach(
  target: number,
  saved: number,
  deposit: number,
  r: number,
): number | null {
  if (saved >= target) return 0;
  if (deposit <= 0 && r === 0) return null;
  let balance = saved;
  for (let month = 1; month <= MAX_MONTHS; month++) {
    balance = Math.round(balance * (1 + r)) + deposit;
    if (balance >= target) return month;
  }
  return null;
}

/** Depósito mensal necessário para chegar em `target` em `n` meses. */
export function depositNeeded(
  target: number,
  saved: number,
  r: number,
  n: number,
): number {
  if (n <= 0) return Math.max(target - saved, 0);
  const growth = Math.pow(1 + r, n);
  const remaining = target - saved * growth;
  if (remaining <= 0) return 0;
  if (r === 0) return Math.ceil(remaining / n);
  return Math.ceil((remaining * r) / (growth - 1));
}

// ---------------------------------------------------------------------
// Conquistar algo (ex.: uma moto)
// ---------------------------------------------------------------------

export type GoalPlanInput = {
  target: number;
  saved: number;
  income: number;
  /** gastos mensais atuais (o que sai todo mês) */
  expenses: number;
  desiredMonths: number | null;
  /** rendimento mensal estimado do dinheiro guardado, em % (opcional) */
  monthlyReturnPct: number | null;
  /** % da sobra que fica de folga para imprevistos (padrão 10) */
  reservePct?: number;
};

export type GoalScenario = {
  id: "comfortable" | "max" | "deadline";
  title: string;
  monthly: number;
  months: number | null;
  feasible: boolean;
  /** % da renda que vai para o plano */
  shareOfIncome: number;
  note: string;
};

export type GoalPlan = {
  surplus: number;
  scenarios: GoalScenario[];
  recommendedId: GoalScenario["id"] | null;
  warnings: string[];
};

export function planGoal(input: GoalPlanInput): GoalPlan {
  const { target, saved, income, expenses, desiredMonths } = input;
  const r = toRate(input.monthlyReturnPct);
  const reserve = Math.min(Math.max(input.reservePct ?? 10, 0), 90);
  const surplus = income - expenses;
  const warnings: string[] = [];
  const scenarios: GoalScenario[] = [];
  const share = (monthly: number) => (income > 0 ? (monthly / income) * 100 : 0);

  if (surplus <= 0) {
    warnings.push(
      "Hoje a sua renda não cobre os seus gastos. Antes de guardar para esta meta, o primeiro passo é equilibrar o mês: reduzir gastos ou aumentar a renda.",
    );
  }
  if (saved >= target) {
    warnings.push("Você já tem o valor da meta guardado.");
    return { surplus, scenarios, recommendedId: null, warnings };
  }

  const comfortableMonthly = surplus > 0 ? Math.floor((surplus * (100 - reserve)) / 100) : 0;

  if (comfortableMonthly > 0) {
    const months = monthsToReach(target, saved, comfortableMonthly, r);
    scenarios.push({
      id: "comfortable",
      title: "No seu ritmo, com folga",
      monthly: comfortableMonthly,
      months,
      feasible: months !== null,
      shareOfIncome: share(comfortableMonthly),
      note: `Guarda ${formatBRL(comfortableMonthly)} por mês e deixa ${formatBRL(surplus - comfortableMonthly)} de folga para imprevistos.`,
    });
  }

  if (surplus > 0 && surplus !== comfortableMonthly) {
    const months = monthsToReach(target, saved, surplus, r);
    scenarios.push({
      id: "max",
      title: "Usando toda a sobra",
      monthly: surplus,
      months,
      feasible: months !== null,
      shareOfIncome: share(surplus),
      note: "É o caminho mais rápido sem mexer nos gastos, mas não sobra nenhuma folga: um imprevisto pode atrasar o plano.",
    });
  }

  if (desiredMonths && desiredMonths > 0) {
    const monthly = depositNeeded(target, saved, r, desiredMonths);
    const feasible = surplus > 0 && monthly <= surplus;
    scenarios.push({
      id: "deadline",
      title: `Em ${desiredMonths} ${desiredMonths === 1 ? "mês" : "meses"}`,
      monthly,
      months: desiredMonths,
      feasible,
      shareOfIncome: share(monthly),
      note: feasible
        ? `Cabe na sua sobra de ${formatBRL(surplus)} por mês.`
        : `Pede ${formatBRL(monthly)} por mês, ${formatBRL(monthly - Math.max(surplus, 0))} a mais do que sobra hoje. Para esse prazo, seria preciso cortar gastos ou aumentar a renda nesse valor.`,
    });
  }

  // Recomendação: prazo desejado se couber com folga; senão, o ritmo com folga.
  const deadline = scenarios.find((s) => s.id === "deadline");
  const comfortable = scenarios.find((s) => s.id === "comfortable");
  let recommendedId: GoalPlan["recommendedId"] = null;
  if (deadline?.feasible && (!comfortable || deadline.monthly <= comfortable.monthly)) {
    recommendedId = "deadline";
  } else if (comfortable?.feasible) {
    recommendedId = "comfortable";
  } else if (scenarios.find((s) => s.id === "max")?.feasible) {
    recommendedId = "max";
  }

  const longest = Math.max(...scenarios.map((s) => s.months ?? 0), 0);
  if (longest > 60) {
    warnings.push(
      "O prazo passa de 5 anos. Vale pensar em aumentar a renda ou reduzir gastos para encurtar o caminho.",
    );
  }
  if (scenarios.some((s) => s.shareOfIncome > 50)) {
    warnings.push("Algum cenário compromete mais da metade da renda: é difícil de manter por muito tempo.");
  }
  if (r > 0) {
    warnings.push(
      "O rendimento é uma estimativa informada por você e não é garantido. Simule também com 0% para ver o cenário sem rendimento.",
    );
  }

  return { surplus, scenarios, recommendedId, warnings };
}

// ---------------------------------------------------------------------
// Sair de uma dívida (ex.: cartão atrasado)
// ---------------------------------------------------------------------

export type DebtPlanInput = {
  debt: number;
  income: number;
  /** gastos essenciais do mês (moradia, contas, comida, transporte) */
  essentials: number;
  /** juros da dívida ao mês, em % (se desconhecido, null: a conta ignora juros) */
  monthlyInterestPct: number | null;
};

export type DebtOption = {
  id: string;
  title: string;
  months: number;
  payment: number;
  total: number;
  interest: number;
  /** % da sobra mensal que a parcela consome */
  shareOfSurplus: number;
  feasible: boolean;
  note: string;
};

export type DebtPlan = {
  surplus: number;
  options: DebtOption[];
  recommendedId: string | null;
  warnings: string[];
};

const TERMS = [3, 6, 12, 18, 24, 36];
/** Parcela confortável: no máximo 80% da sobra, deixando folga. */
const COMFORT_SHARE = 0.8;

export function planDebt(input: DebtPlanInput): DebtPlan {
  const { debt, income, essentials } = input;
  const r = toRate(input.monthlyInterestPct);
  const surplus = income - essentials;
  const warnings: string[] = [];
  const options: DebtOption[] = [];
  const share = (payment: number) => (surplus > 0 ? (payment / surplus) * 100 : Infinity);

  if (input.monthlyInterestPct === null) {
    warnings.push(
      "Você não informou os juros da dívida, então a conta ignora juros e mostra só o mínimo. Pergunte ao banco a taxa ao mês para ver o custo real.",
    );
  }
  if (surplus <= 0) {
    warnings.push(
      "Hoje os gastos essenciais já consomem toda a renda. Sem sobra, nenhum parcelamento fecha: o primeiro passo é negociar um desconto ou prazo maior e buscar uma renda extra.",
    );
  }
  if (debt > income * 3 && income > 0) {
    warnings.push("A dívida é mais de 3 vezes a sua renda mensal. Renegociar com desconto costuma ser o primeiro passo.");
  }

  for (const n of TERMS) {
    const payment = installment(debt, r, n);
    const total = payment * n;
    options.push({
      id: `parcelar-${n}`,
      title: `Parcelar em ${n}x`,
      months: n,
      payment,
      total,
      interest: Math.max(total - debt, 0),
      shareOfSurplus: share(payment),
      feasible: surplus > 0 && payment <= surplus,
      note:
        surplus <= 0
          ? "Sem sobra para pagar."
          : payment > surplus
            ? `A parcela passa da sua sobra de ${formatBRL(surplus)}.`
            : payment <= surplus * COMFORT_SHARE
              ? "Cabe na sua sobra, com folga."
              : "Cabe, mas deixa pouca folga.",
    });
  }

  // Pagando com a maior parte da sobra todo mês, sem prazo fixo
  const flexPayment = Math.floor(Math.max(surplus, 0) * COMFORT_SHARE);
  const flex = simulatePayoff(debt, r, flexPayment);
  if (flex) {
    options.push({
      id: "sobra",
      title: "Pagando com a sua sobra",
      months: flex.months,
      payment: flexPayment,
      total: flex.total,
      interest: Math.max(flex.total - debt, 0),
      shareOfSurplus: share(flexPayment),
      feasible: true,
      note: `Usa 80% da sobra por mês (${formatBRL(flexPayment)}) e termina quando a dívida acabar.`,
    });
  }

  // Recomendação: o prazo mais curto cuja parcela cabe com folga (paga menos juros).
  const comfy = options
    .filter((o) => o.id.startsWith("parcelar-") && o.feasible && o.shareOfSurplus <= COMFORT_SHARE * 100)
    .sort((a, b) => a.months - b.months)[0];
  const tight = options
    .filter((o) => o.id.startsWith("parcelar-") && o.feasible)
    .sort((a, b) => a.months - b.months)[0];
  const recommended = comfy ?? tight ?? options.find((o) => o.id === "sobra") ?? null;

  if (!comfy && tight) {
    warnings.push("Nenhuma parcela cabe com folga: a mais curta que cabe deixa o orçamento apertado. Tente também renegociar um desconto.");
  }
  if (!tight && surplus > 0) {
    warnings.push(
      `Mesmo no prazo mais longo a parcela passa da sua sobra de ${formatBRL(surplus)}. Negocie desconto ou entrada, corte gastos não essenciais ou busque renda extra.`,
    );
  }

  warnings.push(
    "Priorize os gastos essenciais (moradia, água, luz, comida) antes da dívida. Dívida de cartão costuma ter juros altos: renegociar para quitar com desconto ou parcelar costuma sair mais barato do que deixar rolar.",
  );

  return { surplus, options, recommendedId: recommended?.id ?? null, warnings };
}
