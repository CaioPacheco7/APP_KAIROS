import type { createClient } from "@/lib/supabase/server";
import { MAX_INSTALLMENTS, invoiceFor, planPurchase, type CardCycle } from "@/lib/finance/cards";
import type { TransactionStatus, TransactionType } from "@/types/database";

export type Db = Awaited<ReturnType<typeof createClient>>;

export type TransactionInput = {
  type: TransactionType;
  amount: number; // centavos, > 0
  date: string; // YYYY-MM-DD
  status: TransactionStatus;
  description: string | null;
  account_id: string;
  category_id: string | null;
  transfer_account_id: string | null;
};

/**
 * Regras de negócio de uma transação (RN-04). Devolve a mensagem de erro
 * ou null se estiver tudo certo. O banco também garante o formato
 * (constraint transactions_shape); aqui damos uma mensagem clara.
 */
export async function validateTransaction(
  db: Db,
  input: Omit<TransactionInput, "account_id"> & { account_id: string | null },
): Promise<string | null> {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    return "O valor precisa ser maior que zero.";
  }

  if (input.type === "transfer") {
    if (!input.transfer_account_id) return "Escolha a conta de destino.";
    if (input.transfer_account_id === input.account_id) {
      return "A conta de destino precisa ser diferente da de origem.";
    }
    if (input.category_id) return "Transferência não tem categoria.";
    return null;
  }

  if (input.transfer_account_id) return "Só transferências têm conta de destino.";

  if (input.category_id) {
    const { data } = await db
      .from("categories")
      .select("type")
      .eq("id", input.category_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (!data) return "Categoria não encontrada.";
    if (data.type !== input.type) {
      return input.type === "income"
        ? "Essa categoria é de despesa, não de receita."
        : "Essa categoria é de receita, não de despesa.";
    }
  }
  return null;
}

export async function insertTransaction(
  db: Db,
  userId: string,
  input: TransactionInput,
): Promise<{ id: string } | { error: string }> {
  const invalid = await validateTransaction(db, input);
  if (invalid) return { error: invalid };

  const { data, error } = await db
    .from("transactions")
    .insert({ ...input, user_id: userId })
    .select("id")
    .single();

  if (error || !data) return { error: "Não foi possível salvar a transação." };
  return { id: data.id as string };
}

export async function updateTransaction(
  db: Db,
  id: string,
  input: TransactionInput,
): Promise<{ error: string } | null> {
  const invalid = await validateTransaction(db, input);
  if (invalid) return { error: invalid };

  // Se era compra no cartão (avulsa), passa a ser da conta escolhida.
  const { data, error } = await db
    .from("transactions")
    .update({ ...input, card_id: null, invoice_month: null })
    .eq("id", id)
    .is("deleted_at", null)
    .is("installment_group_id", null)
    .select("id");

  if (error || !data?.length) {
    return { error: "Não foi possível atualizar a transação." };
  }
  return null;
}

// ---------------------------------------------------------------------
// Cartão de crédito (RN-05..RN-09)
// ---------------------------------------------------------------------

export type CardPurchaseInput = {
  amount: number;
  date: string;
  description: string | null;
  category_id: string | null;
  card_id: string;
  installments: number;
};

type CardRow = { id: string; closing_day: number; due_day: number };

async function loadCard(db: Db, cardId: string): Promise<CardCycle | null> {
  const { data } = await db
    .from("credit_cards")
    .select("id, closing_day, due_day")
    .eq("id", cardId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .maybeSingle();
  const card = data as CardRow | null;
  return card ? { closingDay: Number(card.closing_day), dueDay: Number(card.due_day) } : null;
}

const monthStart = (month: string) => `${month}-01`;

/**
 * Compra no cartão: uma linha por parcela, cada uma na sua fatura (RN-07).
 * Um único insert (tudo ou nada). Compra no cartão já aconteceu: "efetivada";
 * ela só sai da conta quando a fatura for paga (RN-05).
 */
export async function insertCardPurchase(
  db: Db,
  userId: string,
  input: CardPurchaseInput,
): Promise<{ ids: string[] } | { error: string }> {
  const invalid = await validateTransaction(db, {
    type: "expense",
    amount: input.amount,
    date: input.date,
    status: "settled",
    description: input.description,
    account_id: null,
    category_id: input.category_id,
    transfer_account_id: null,
  });
  if (invalid) return { error: invalid };
  if (!Number.isInteger(input.installments) || input.installments < 1 || input.installments > MAX_INSTALLMENTS) {
    return { error: `Parcelas: de 1 a ${MAX_INSTALLMENTS}.` };
  }
  if (input.amount < input.installments) return { error: "O valor é pequeno demais para tantas parcelas." };

  const cycle = await loadCard(db, input.card_id);
  if (!cycle) return { error: "Cartão não encontrado." };

  const plan = planPurchase({ amount: input.amount, date: input.date, installments: input.installments, cycle });
  const group = plan.length > 1 ? crypto.randomUUID() : null;
  const rows = plan.map((p) => ({
    user_id: userId,
    type: "expense" as const,
    amount: p.amount,
    date: p.date,
    status: "settled" as const,
    description: input.description,
    account_id: null,
    category_id: input.category_id,
    transfer_account_id: null,
    card_id: input.card_id,
    invoice_month: monthStart(p.invoiceMonth),
    installment_group_id: group,
    installment_number: group ? p.number : null,
    installment_total: group ? plan.length : null,
  }));

  const { data, error } = await db.from("transactions").insert(rows).select("id");
  if (error || !data?.length) return { error: "Não foi possível salvar a compra." };
  return { ids: (data as { id: string }[]).map((r) => r.id) };
}

/**
 * Edita uma compra avulsa no cartão (ou move uma transação da conta para o
 * cartão). A fatura é recalculada pela data. Parcelas não passam por aqui.
 */
export async function updateCardPurchase(
  db: Db,
  id: string,
  input: Omit<CardPurchaseInput, "installments">,
): Promise<{ error: string } | null> {
  const invalid = await validateTransaction(db, {
    type: "expense",
    amount: input.amount,
    date: input.date,
    status: "settled",
    description: input.description,
    account_id: null,
    category_id: input.category_id,
    transfer_account_id: null,
  });
  if (invalid) return { error: invalid };
  const cycle = await loadCard(db, input.card_id);
  if (!cycle) return { error: "Cartão não encontrado." };

  const { data, error } = await db
    .from("transactions")
    .update({
      type: "expense",
      amount: input.amount,
      date: input.date,
      status: "settled",
      description: input.description,
      account_id: null,
      category_id: input.category_id,
      transfer_account_id: null,
      card_id: input.card_id,
      invoice_month: monthStart(invoiceFor(input.date, cycle)),
    })
    .eq("id", id)
    .is("deleted_at", null)
    .is("installment_group_id", null)
    .is("recurrence_id", null)
    .select("id");
  if (error || !data?.length) return { error: "Não foi possível atualizar a compra." };
  return null;
}

/** Compra parcelada: muda descrição e categoria de TODAS as parcelas. */
export async function updateInstallmentGroup(
  db: Db,
  groupId: string,
  fields: { description: string | null; category_id: string | null },
): Promise<{ error: string } | null> {
  const invalid = await validateTransaction(db, {
    type: "expense",
    amount: 1,
    date: "2000-01-01",
    status: "settled",
    description: fields.description,
    account_id: null,
    category_id: fields.category_id,
    transfer_account_id: null,
  });
  if (invalid) return { error: invalid };
  const { data, error } = await db
    .from("transactions")
    .update(fields)
    .eq("installment_group_id", groupId)
    .is("deleted_at", null)
    .select("id");
  if (error || !data?.length) return { error: "Não foi possível atualizar as parcelas." };
  return null;
}
