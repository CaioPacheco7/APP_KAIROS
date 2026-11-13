"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isISODate } from "@/lib/dates";
import { parseMoneyToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/user";
import {
  insertTransaction,
  updateTransaction,
  type TransactionInput,
} from "./core/transactions";
import type { ActionState } from "./types";
import { emptyToNull, fieldErrorsFrom, formString } from "./validation";

const schema = z.object({
  type: z.enum(["income", "expense", "transfer"], { message: "Escolha o tipo" }),
  amount: z.string().trim().min(1, "Informe o valor"),
  date: z.string().refine(isISODate, "Data inválida"),
  account_id: z.uuid("Escolha a conta"),
  transfer_account_id: z.string().optional(),
  category_id: z.string().optional(),
  description: z.string().trim().max(120, "Máximo de 120 caracteres").optional(),
});

/** Cria (sem `id`) ou edita (com `id`) uma transação. */
export async function saveTransactionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse({
    type: formString(formData, "type"),
    amount: formString(formData, "amount"),
    date: formString(formData, "date"),
    account_id: formString(formData, "account_id"),
    transfer_account_id: formString(formData, "transfer_account_id"),
    category_id: formString(formData, "category_id"),
    description: formString(formData, "description"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Confira os campos.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const amount = parseMoneyToCents(parsed.data.amount);
  if (amount === null || amount <= 0) {
    return {
      status: "error",
      message: "Confira os campos.",
      fieldErrors: { amount: "Valor inválido. Ex.: 50,00" },
    };
  }

  const isTransfer = parsed.data.type === "transfer";
  const input: TransactionInput = {
    type: parsed.data.type,
    amount,
    date: parsed.data.date,
    status: formData.get("settled") === "on" ? "settled" : "pending",
    description: emptyToNull(parsed.data.description),
    account_id: parsed.data.account_id,
    category_id: isTransfer ? null : emptyToNull(parsed.data.category_id),
    transfer_account_id: isTransfer
      ? emptyToNull(parsed.data.transfer_account_id)
      : null,
  };

  const db = await createClient();
  const id = formString(formData, "id");

  if (id) {
    const failure = await updateTransaction(db, id, input);
    if (failure) return { status: "error", message: failure.error };
  } else {
    const userId = await requireUserId();
    const result = await insertTransaction(db, userId, input);
    if ("error" in result) return { status: "error", message: result.error };
  }

  revalidatePath("/", "layout");
  return { status: "success" };
}

/** Exclusão lógica (RN-18): a transação some, mas pode ser recuperada no banco. */
export async function deleteTransactionAction(formData: FormData): Promise<void> {
  const id = formString(formData, "id");
  if (!id) return;
  const db = await createClient();
  await db
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/", "layout");
}
