"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isISODate } from "@/lib/dates";
import { parseMoneyToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/user";
import {
  insertCardPurchase,
  insertTransaction,
  updateCardPurchase,
  updateInstallmentGroup,
  updateTransaction,
  type TransactionInput,
} from "./core/transactions";
import type { ActionState } from "./types";
import { emptyToNull, fieldErrorsFrom, formString } from "./validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "a:<id>" = conta · "c:<id>" = cartão de crédito */
function parseSource(raw: string): { kind: "account" | "card"; id: string } | null {
  const [prefix, id] = raw.split(":");
  if (!id || !UUID.test(id)) return null;
  if (prefix === "a") return { kind: "account", id };
  if (prefix === "c") return { kind: "card", id };
  return null;
}

const schema = z.object({
  type: z.enum(["income", "expense", "transfer"], { message: "Escolha o tipo" }),
  amount: z.string().trim().min(1, "Informe o valor"),
  date: z.string().refine(isISODate, "Data inválida"),
  source: z.string().min(1, "Escolha a conta ou o cartão"),
  transfer_account_id: z.string().optional(),
  category_id: z.string().optional(),
  description: z.string().trim().max(120, "Máximo de 120 caracteres").optional(),
  installments: z.string().optional(),
});

type Existing = {
  type: "income" | "expense" | "transfer";
  card_id: string | null;
  installment_group_id: string | null;
};

const fail = (fieldErrors: Record<string, string>): ActionState => ({
  status: "error",
  message: "Confira os campos.",
  fieldErrors,
});

/** Cria (sem `id`) ou edita (com `id`) uma transação ou compra no cartão. */
export async function saveTransactionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const db = await createClient();
  const id = formString(formData, "id");

  // Parcela: só descrição e categoria, valendo para a compra toda (RN-09).
  let existing: Existing | null = null;
  if (id) {
    const { data } = await db
      .from("transactions")
      .select("type, card_id, installment_group_id")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    existing = data as Existing | null;
    if (!existing) return { status: "error", message: "Transação não encontrada." };
    if (existing.type === "transfer" && existing.card_id) {
      return { status: "error", message: "Pagamento de fatura não se edita: exclua e pague de novo." };
    }
    if (existing.installment_group_id) {
      const failure = await updateInstallmentGroup(db, existing.installment_group_id, {
        description: emptyToNull(formString(formData, "description")),
        category_id: emptyToNull(formString(formData, "category_id")),
      });
      if (failure) return { status: "error", message: failure.error };
      revalidatePath("/", "layout");
      return { status: "success" };
    }
  }

  const parsed = schema.safeParse({
    type: formString(formData, "type"),
    amount: formString(formData, "amount"),
    date: formString(formData, "date"),
    source: formString(formData, "source"),
    transfer_account_id: formString(formData, "transfer_account_id"),
    category_id: formString(formData, "category_id"),
    description: formString(formData, "description"),
    installments: formString(formData, "installments"),
  });
  if (!parsed.success) return fail(fieldErrorsFrom(parsed.error));

  const amount = parseMoneyToCents(parsed.data.amount);
  if (amount === null || amount <= 0) return fail({ amount: "Valor inválido. Ex.: 50,00" });

  const source = parseSource(parsed.data.source);
  if (!source) return fail({ source: "Escolha a conta ou o cartão" });

  const isTransfer = parsed.data.type === "transfer";
  const description = emptyToNull(parsed.data.description);
  const categoryId = isTransfer ? null : emptyToNull(parsed.data.category_id);

  // ----- Compra no cartão -----
  if (source.kind === "card") {
    if (parsed.data.type !== "expense") {
      return fail({ source: "No cartão só entram despesas. Escolha uma conta." });
    }
    if (id) {
      const failure = await updateCardPurchase(db, id, {
        amount,
        date: parsed.data.date,
        description,
        category_id: categoryId,
        card_id: source.id,
      });
      if (failure) return { status: "error", message: failure.error };
    } else {
      const installments = Number(parsed.data.installments || "1");
      const userId = await requireUserId();
      const result = await insertCardPurchase(db, userId, {
        amount,
        date: parsed.data.date,
        description,
        category_id: categoryId,
        card_id: source.id,
        installments,
      });
      if ("error" in result) return { status: "error", message: result.error };
    }
    revalidatePath("/", "layout");
    return { status: "success" };
  }

  // ----- Conta -----
  const input: TransactionInput = {
    type: parsed.data.type,
    amount,
    date: parsed.data.date,
    status: formData.get("settled") === "on" ? "settled" : "pending",
    description,
    account_id: source.id,
    category_id: categoryId,
    transfer_account_id: isTransfer ? emptyToNull(parsed.data.transfer_account_id) : null,
  };

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

/**
 * Exclusão lógica (RN-18): a transação some, mas pode ser recuperada no banco.
 * Parcela (RN-09): `scope` = "one" (só esta), "next" (esta e as próximas) ou
 * "all" (a compra toda).
 */
export async function deleteTransactionAction(formData: FormData): Promise<void> {
  const id = formString(formData, "id");
  if (!id) return;
  const scope = formString(formData, "scope");
  const db = await createClient();
  const now = new Date().toISOString();

  if (scope === "next" || scope === "all") {
    const { data } = await db
      .from("transactions")
      .select("installment_group_id, installment_number")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    const row = data as { installment_group_id: string | null; installment_number: number | null } | null;
    if (row?.installment_group_id) {
      let query = db
        .from("transactions")
        .update({ deleted_at: now })
        .eq("installment_group_id", row.installment_group_id)
        .is("deleted_at", null);
      if (scope === "next") query = query.gte("installment_number", row.installment_number ?? 1);
      await query;
      revalidatePath("/", "layout");
      return;
    }
  }

  await db.from("transactions").update({ deleted_at: now }).eq("id", id);
  revalidatePath("/", "layout");
}
