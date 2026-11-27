/**
 * Reserva em meses: por quantos meses o saldo de hoje pagaria os seus gastos.
 * Função pura; os números vêm de quem chama.
 */

export type Reserve = {
  /** meses que o saldo cobre (0 se o saldo não é positivo) */
  months: number;
  /** gasto mensal usado na conta, em centavos */
  monthlyCost: number;
  /** de onde veio o gasto mensal: média dos meses anteriores ou o mês atual */
  basis: "history" | "current";
  /** quantos meses anteriores entraram na média */
  monthsUsed: number;
};

/** Referência comum de reserva de emergência: de 3 a 6 meses de gastos. */
export const RESERVE_TARGET = 6;

/**
 * `pastMonths`: gastos (pagos + agendados) dos meses anteriores, do mais
 * antigo ao mais novo. Usa a média dos últimos 3 com movimento; sem histórico,
 * usa o que já está comprometido no mês atual.
 */
export function reserveMonths(
  balance: number,
  pastMonths: number[],
  currentCommitted: number,
): Reserve | null {
  const recent = pastMonths.filter((v) => v > 0).slice(-3);
  let monthlyCost: number;
  let basis: Reserve["basis"];
  if (recent.length > 0) {
    monthlyCost = Math.round(recent.reduce((s, v) => s + v, 0) / recent.length);
    basis = "history";
  } else if (currentCommitted > 0) {
    monthlyCost = currentCommitted;
    basis = "current";
  } else {
    return null;
  }
  return {
    months: balance > 0 ? balance / monthlyCost : 0,
    monthlyCost,
    basis,
    monthsUsed: basis === "history" ? recent.length : 0,
  };
}

const oneDecimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** 0,4 -> "0,4 mês"; 2,46 -> "2,5 meses"; 12 -> "12 meses" (singular abaixo de 2, como no português) */
export function formatMonths(months: number): string {
  const rounded = Math.round(months * 10) / 10;
  return `${oneDecimal.format(rounded)} ${rounded < 2 ? "mês" : "meses"}`;
}
