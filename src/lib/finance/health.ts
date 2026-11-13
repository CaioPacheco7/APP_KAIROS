/**
 * Semáforo de saúde financeira do mês. Função pura (sem banco, sem hora
 * atual): quem chama informa os números e o "hoje".
 *
 *   verde:    comprometido <= greenMax % da renda
 *   amarelo:  até yellowMax %
 *   vermelho: acima, ou se o ritmo de gastos projeta passar do limite
 *
 * "Comprometido" = despesas efetivadas + agendadas do mês.
 */

import { formatBRL } from "@/lib/money";

export type HealthLevel = "green" | "yellow" | "red" | "unknown";

export type HealthInput = {
  /** renda esperada do mês, em centavos (recebida + a receber) */
  income: number;
  /** despesas do mês já pagas + agendadas */
  committed: number;
  /** parte de `committed` que vem de contas fixas (recorrências) */
  fixed: number;
  /** parte de `committed` que NÃO é fixa (gastos do dia a dia) */
  variable: number;
  /** "2026-11" */
  month: string;
  /** "2026-11-13" */
  today: string;
  greenMax?: number;
  yellowMax?: number;
};

export type Health = {
  level: HealthLevel;
  label: string;
  /** % da renda comprometida (ex.: 75) */
  ratio: number | null;
  /** renda − comprometido; pode ser negativo */
  remaining: number;
  /** quanto dá para gastar por dia até o fim do mês (só mês atual) */
  perDay: number | null;
  /** gasto projetado até o fim do mês no ritmo atual (só mês atual) */
  projected: number | null;
  message: string;
};

const RANK: Record<Exclude<HealthLevel, "unknown">, number> = {
  green: 0,
  yellow: 1,
  red: 2,
};

const LABEL: Record<HealthLevel, string> = {
  green: "Saudável",
  yellow: "Atenção",
  red: "Em risco",
  unknown: "Sem renda informada",
};

function levelFor(ratioPct: number, greenMax: number, yellowMax: number) {
  if (ratioPct <= greenMax) return "green" as const;
  if (ratioPct <= yellowMax) return "yellow" as const;
  return "red" as const;
}

const worst = (
  a: Exclude<HealthLevel, "unknown">,
  b: Exclude<HealthLevel, "unknown">,
) => (RANK[a] >= RANK[b] ? a : b);

function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function assessHealth(input: HealthInput): Health {
  const { income, committed, fixed, variable, month, today } = input;
  const greenMax = input.greenMax ?? 70;
  const yellowMax = input.yellowMax ?? 90;
  const remaining = income - committed;

  if (income <= 0) {
    return {
      level: "unknown",
      label: LABEL.unknown,
      ratio: null,
      remaining,
      perDay: null,
      projected: null,
      message:
        "Cadastre a renda do mês para eu avaliar como estão as suas finanças.",
    };
  }

  const ratio = (committed / income) * 100;
  let level = levelFor(ratio, greenMax, yellowMax);

  // Projeção: só no mês em andamento, e só depois de alguns dias de dados.
  const isCurrent = today.startsWith(month);
  const total = daysInMonth(month);
  const elapsed = isCurrent ? Number(today.slice(8, 10)) : 0;
  let projected: number | null = null;
  let perDay: number | null = null;

  if (isCurrent) {
    const pace = elapsed >= 7 ? (variable / elapsed) * total : variable;
    projected = Math.round(fixed + pace);
    if (elapsed >= 7) {
      level = worst(level, levelFor((projected / income) * 100, greenMax, yellowMax));
    }
    const daysLeft = total - elapsed + 1;
    if (remaining > 0 && daysLeft > 0) perDay = Math.floor(remaining / daysLeft);
  }

  const pct = `${Math.round(ratio)}%`;
  let message: string;

  if (committed > income) {
    message =
      `Cuidado: você já gastou ou agendou ${formatBRL(committed - income)} ` +
      `a mais do que ganha neste mês.`;
  } else if (level === "green") {
    message =
      `Você comprometeu ${pct} da renda do mês. Sobram ${formatBRL(remaining)}` +
      (perDay ? `, cerca de ${formatBRL(perDay)} por dia.` : ".");
  } else if (level === "yellow") {
    message =
      `Atenção: ${pct} da renda já está comprometida. Sobram ${formatBRL(remaining)} ` +
      `para o resto do mês` +
      (perDay ? ` (cerca de ${formatBRL(perDay)} por dia).` : ".");
  } else {
    message =
      `Cuidado: ${pct} da renda está comprometida. Sobram só ${formatBRL(remaining)}; ` +
      `qualquer imprevisto pode estourar o mês.`;
  }

  if (projected !== null && elapsed >= 7 && projected > income && committed <= income) {
    message +=
      ` No ritmo atual, você deve fechar o mês com ${formatBRL(projected)} em gastos, ` +
      `acima da renda de ${formatBRL(income)}.`;
  }

  return { level, label: LABEL[level], ratio, remaining, perDay, projected, message };
}
