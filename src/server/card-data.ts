import { cache } from "react";
import {
  cardUsage,
  currentInvoice,
  describeInvoices,
  type CardCycle,
  type Invoice,
  type InvoiceTotals,
} from "@/lib/finance/cards";
import { createClient } from "@/lib/supabase/server";
import { TRANSACTION_COLUMNS, type CardInvoiceRow, type CreditCard, type Transaction } from "@/types/database";

/** Cartões ativos (não arquivados), do mais antigo para o mais novo. */
export const getCards = cache(async (): Promise<CreditCard[]> => {
  const db = await createClient();
  const { data } = await db
    .from("credit_cards")
    .select("id, name, credit_limit, closing_day, due_day, default_account_id, archived_at")
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  return ((data ?? []) as CreditCard[]).map((c) => ({
    ...c,
    credit_limit: Number(c.credit_limit),
    closing_day: Number(c.closing_day),
    due_day: Number(c.due_day),
  }));
});

/** id -> nome de TODOS os cartões (inclusive arquivados), para o histórico. */
export const getCardNames = cache(async (): Promise<Map<string, string>> => {
  const db = await createClient();
  const { data } = await db.from("credit_cards").select("id, name");
  return new Map(((data ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]));
});

export type CardSummary = {
  card: CreditCard;
  cycle: CardCycle;
  /** da mais antiga para a mais nova */
  invoices: Invoice[];
  /** a que pede atenção agora (vencida/fechada com saldo, senão a aberta) */
  current: Invoice;
  usage: ReturnType<typeof cardUsage>;
};

export const cycleOf = (card: Pick<CreditCard, "closing_day" | "due_day">): CardCycle => ({
  closingDay: Number(card.closing_day),
  dueDay: Number(card.due_day),
});

/** Faturas, limite e a fatura atual de cada cartão ativo. */
export const getCardSummaries = cache(async (today: string): Promise<CardSummary[]> => {
  const db = await createClient();
  const [cards, { data }] = await Promise.all([
    getCards(),
    db.from("v_card_invoices").select("card_id, invoice_month, charges, paid, items"),
  ]);
  const byCard = new Map<string, InvoiceTotals[]>();
  for (const r of (data ?? []) as CardInvoiceRow[]) {
    const list = byCard.get(r.card_id) ?? [];
    list.push({ month: r.invoice_month.slice(0, 7), charges: Number(r.charges), paid: Number(r.paid), items: Number(r.items) });
    byCard.set(r.card_id, list);
  }
  return cards.map((card) => {
    const cycle = cycleOf(card);
    const totals = byCard.get(card.id) ?? [];
    const invoices = describeInvoices(totals, cycle, today);
    return {
      card,
      cycle,
      invoices,
      current: currentInvoice(invoices, cycle, today),
      usage: cardUsage(totals, card.credit_limit),
    };
  });
});

/** Compras e pagamentos de uma fatura (compras primeiro, da mais nova para a mais antiga). */
export async function getInvoiceItems(cardId: string, month: string): Promise<Transaction[]> {
  const db = await createClient();
  const { data } = await db
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .is("deleted_at", null)
    .eq("card_id", cardId)
    .eq("invoice_month", `${month}-01`)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  return ((data ?? []) as Transaction[]).map((t) => ({ ...t, amount: Number(t.amount) }));
}
