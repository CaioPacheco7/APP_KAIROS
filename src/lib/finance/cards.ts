/**
 * Cartões de crédito (RN-06..RN-08). Funções puras: em qual fatura cai uma
 * compra, as datas de cada fatura, as parcelas, a situação da fatura e o
 * limite. Quem busca os dados é `server/cards.ts`.
 *
 * A fatura é identificada pelo mês do VENCIMENTO ("fatura de dezembro"),
 * como os bancos chamam. Datas "YYYY-MM-DD"; meses "YYYY-MM".
 */
import { addMonthsClamped, daysInMonth, formatDayMonth, monthLabel, shiftMonth } from "@/lib/dates";

export type CardCycle = { closingDay: number; dueDay: number };

/** Dia `day` do mês, ou o último dia se o mês for mais curto. */
function dayIn(month: string, day: number): string {
  return `${month}-${String(Math.min(day, daysInMonth(month))).padStart(2, "0")}`;
}

/** Vencimento depois do fechamento = fecha e vence no mesmo mês. */
const closesSameMonth = (c: CardCycle) => c.dueDay > c.closingDay;

/** Fechamento e vencimento da fatura do mês `invoiceMonth` (mês do vencimento). */
export function invoiceDates(invoiceMonth: string, cycle: CardCycle): { closing: string; due: string } {
  const closingMonth = closesSameMonth(cycle) ? invoiceMonth : shiftMonth(invoiceMonth, -1);
  return { closing: dayIn(closingMonth, cycle.closingDay), due: dayIn(invoiceMonth, cycle.dueDay) };
}

/**
 * Em qual fatura cai uma compra (RN-06): feita no dia do fechamento ou
 * depois, vai para a fatura seguinte.
 */
export function invoiceFor(purchaseDate: string, cycle: CardCycle): string {
  const month = purchaseDate.slice(0, 7);
  const closingMonth = purchaseDate >= dayIn(month, cycle.closingDay) ? shiftMonth(month, 1) : month;
  return closesSameMonth(cycle) ? closingMonth : shiftMonth(closingMonth, 1);
}

/** Divide em `n` parcelas; o resto dos centavos vai para a primeira (RN-07). */
export function splitInstallments(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + rest : base));
}

export const MAX_INSTALLMENTS = 48;

export type Installment = {
  number: number;
  amount: number;
  /** data em que a parcela conta como gasto: o mesmo dia da compra, mês a mês */
  date: string;
  invoiceMonth: string;
};

/**
 * Parcelas de uma compra: uma por fatura, a partir da fatura da compra. Cada
 * parcela conta como gasto no mês dela (a compra à vista conta inteira no dia).
 */
export function planPurchase(input: {
  amount: number;
  date: string;
  installments: number;
  cycle: CardCycle;
}): Installment[] {
  const first = invoiceFor(input.date, input.cycle);
  return splitInstallments(input.amount, input.installments).map((amount, i) => ({
    number: i + 1,
    amount,
    date: addMonthsClamped(input.date, i),
    invoiceMonth: shiftMonth(first, i),
  }));
}

// ---------------------------------------------------------------------
// Faturas
// ---------------------------------------------------------------------

/**
 * open    = a fatura atual, ainda recebendo compras
 * closed  = fechou e ainda não venceu (é a que se paga agora)
 * overdue = venceu sem ser paga por inteiro
 * paid    = fechou e foi paga
 * future  = só tem parcelas de meses à frente
 */
export type InvoiceState = "open" | "closed" | "overdue" | "paid" | "future";

export type InvoiceTotals = { month: string; charges: number; paid: number; items: number };

export type Invoice = InvoiceTotals & {
  closing: string;
  due: string;
  /** quanto falta pagar (nunca negativo) */
  remaining: number;
  state: InvoiceState;
};

export function describeInvoice(totals: InvoiceTotals, cycle: CardCycle, today: string): Invoice {
  const { closing, due } = invoiceDates(totals.month, cycle);
  const remaining = Math.max(totals.charges - totals.paid, 0);
  const current = invoiceFor(today, cycle);
  let state: InvoiceState;
  if (totals.month > current) state = "future";
  else if (totals.month === current) state = "open";
  else if (remaining === 0) state = "paid";
  else state = today > due ? "overdue" : "closed";
  return { ...totals, closing, due, remaining, state };
}

/** Todas as faturas do cartão, da mais antiga para a mais nova. */
export function describeInvoices(rows: InvoiceTotals[], cycle: CardCycle, today: string): Invoice[] {
  return rows
    .map((r) => describeInvoice(r, cycle, today))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Fatura que pede atenção agora: a mais antiga vencida ou fechada com saldo;
 * senão, a aberta (mesmo que ainda sem compras).
 */
export function currentInvoice(invoices: Invoice[], cycle: CardCycle, today: string): Invoice {
  const due = invoices.find((i) => (i.state === "overdue" || i.state === "closed") && i.remaining > 0);
  if (due) return due;
  const month = invoiceFor(today, cycle);
  return invoices.find((i) => i.month === month) ?? describeInvoice({ month, charges: 0, paid: 0, items: 0 }, cycle, today);
}

export const INVOICE_STATE_LABEL: Record<InvoiceState, string> = {
  open: "Aberta",
  closed: "Fechada",
  overdue: "Vencida",
  paid: "Paga",
  future: "Próxima",
};

/** "fecha 28/11 · vence 05/12", "venceu 05/11", "paga" ... */
export function invoiceWhen(invoice: Invoice): string {
  switch (invoice.state) {
    case "open":
      return `fecha ${formatDayMonth(invoice.closing)} · vence ${formatDayMonth(invoice.due)}`;
    case "closed":
      return `vence ${formatDayMonth(invoice.due)}`;
    case "overdue":
      return `venceu ${formatDayMonth(invoice.due)}`;
    case "paid":
      return `paga · venceu ${formatDayMonth(invoice.due)}`;
    case "future":
      return `vence ${formatDayMonth(invoice.due)}`;
  }
}

/** "fatura de dezembro" (com o ano se não for o do `today`) */
export function invoiceName(month: string, today: string): string {
  const label = monthLabel(month);
  return `fatura de ${month.slice(0, 4) === today.slice(0, 4) ? label.split(" ")[0] : label}`;
}

/**
 * Limite (RN-08): usado = compras − pagamentos de todas as faturas (inclui as
 * parcelas futuras). Disponível pode ficar negativo se passou do limite.
 */
export function cardUsage(invoices: InvoiceTotals[], limit: number): {
  used: number;
  available: number;
  /** 0..1+ (null sem limite cadastrado) */
  ratio: number | null;
} {
  const used = Math.max(invoices.reduce((s, i) => s + i.charges - i.paid, 0), 0);
  return { used, available: limit - used, ratio: limit > 0 ? used / limit : null };
}

/** "3x de R$ 33,34" (a primeira parcela pode ter alguns centavos a mais). */
export function installmentLabel(total: number, n: number, format: (cents: number) => string): string {
  if (n <= 1) return "à vista";
  const parts = splitInstallments(total, n);
  return `${n}x de ${format(parts[parts.length - 1])}${parts[0] !== parts[1] ? ` (a 1ª ${format(parts[0])})` : ""}`;
}
