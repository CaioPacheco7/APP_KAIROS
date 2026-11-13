import type { createClient } from "@/lib/supabase/server";
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
 * (constraint transactions_transfer_shape); aqui damos uma mensagem clara.
 */
export async function validateTransaction(
  db: Db,
  input: TransactionInput,
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

  const { data, error } = await db
    .from("transactions")
    .update(input)
    .eq("id", id)
    .is("deleted_at", null)
    .select("id");

  if (error || !data?.length) {
    return { error: "Não foi possível atualizar a transação." };
  }
  return null;
}
