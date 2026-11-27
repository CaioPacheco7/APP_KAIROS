"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isISODate, todayISO } from "@/lib/dates";
import { parseMoneyToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/user";
import type { ActionState } from "./types";
import { emptyToNull, fieldErrorsFrom, formString } from "./validation";

const day = z.coerce
  .number({ message: "Informe o dia" })
  .int("Dia inválido")
  .min(1, "Entre 1 e 31")
  .max(31, "Entre 1 e 31");

const cardSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(40, "Máximo de 40 caracteres"),
  credit_limit: z.string(),
  closing_day: day,
  due_day: day,
  default_account_id: z.string().optional(),
});

/** Cria (sem `id`) ou edita (com `id`) um cartão. */
export async function saveCardAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = cardSchema.safeParse({
    name: formString(formData, "name"),
    credit_limit: formString(formData, "credit_limit"),
    closing_day: formString(formData, "closing_day"),
    due_day: formString(formData, "due_day"),
    default_account_id: formString(formData, "default_account_id"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Confira os campos.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const rawLimit = parsed.data.credit_limit.trim();
  const credit_limit = rawLimit ? parseMoneyToCents(rawLimit) : 0;
  if (credit_limit === null || credit_limit < 0) {
    return { status: "error", message: "Confira os campos.", fieldErrors: { credit_limit: "Valor inválido. Ex.: 5000,00" } };
  }
  if (parsed.data.closing_day === parsed.data.due_day) {
    return {
      status: "error",
      message: "Confira os campos.",
      fieldErrors: { due_day: "O vencimento cai depois do fechamento, em outro dia" },
    };
  }

  const fields = {
    name: parsed.data.name,
    credit_limit,
    closing_day: parsed.data.closing_day,
    due_day: parsed.data.due_day,
    default_account_id: emptyToNull(parsed.data.default_account_id),
  };
  const db = await createClient();
  const id = formString(formData, "id");
  if (id) {
    const { data, error } = await db.from("credit_cards").update(fields).eq("id", id).is("deleted_at", null).select("id");
    if (error || !data?.length) return { status: "error", message: "Não foi possível salvar o cartão." };
  } else {
    const userId = await requireUserId();
    const { error } = await db.from("credit_cards").insert({ ...fields, user_id: userId });
    if (error) return { status: "error", message: "Não foi possível criar o cartão." };
  }
  revalidatePath("/", "layout");
  return { status: "success" };
}

/** Arquiva um cartão: some das telas e dos formulários, o histórico fica. */
export async function archiveCardAction(formData: FormData): Promise<void> {
  const id = formString(formData, "id");
  if (!id) return;
  const db = await createClient();
  await db.from("credit_cards").update({ archived_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/", "layout");
}

const paySchema = z.object({
  card_id: z.uuid("Cartão inválido"),
  invoice_month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Fatura inválida"),
  account_id: z.uuid("Escolha a conta"),
  amount: z.string().trim().min(1, "Informe o valor"),
  date: z.string().refine(isISODate, "Data inválida"),
});

/**
 * Paga (toda ou parte de) uma fatura: transferência da conta para o cartão
 * (RN-05). Sai da conta, não conta como despesa (a compra já contou).
 */
export async function payInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = paySchema.safeParse({
    card_id: formString(formData, "card_id"),
    invoice_month: formString(formData, "invoice_month"),
    account_id: formString(formData, "account_id"),
    amount: formString(formData, "amount"),
    date: formString(formData, "date"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Confira os campos.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const amount = parseMoneyToCents(parsed.data.amount);
  if (amount === null || amount <= 0) {
    return { status: "error", message: "Confira os campos.", fieldErrors: { amount: "Valor inválido. Ex.: 450,00" } };
  }
  if (parsed.data.date > todayISO()) {
    return { status: "error", message: "Confira os campos.", fieldErrors: { date: "O pagamento não pode ser no futuro" } };
  }

  const db = await createClient();
  const [{ data: card }, { data: account }] = await Promise.all([
    db.from("credit_cards").select("name").eq("id", parsed.data.card_id).is("deleted_at", null).maybeSingle(),
    db
      .from("accounts")
      .select("id")
      .eq("id", parsed.data.account_id)
      .is("deleted_at", null)
      .is("archived_at", null)
      .maybeSingle(),
  ]);
  if (!card) return { status: "error", message: "Cartão não encontrado." };
  if (!account) return { status: "error", message: "Conta não encontrada." };

  const userId = await requireUserId();
  const { error } = await db.from("transactions").insert({
    user_id: userId,
    type: "transfer",
    amount,
    date: parsed.data.date,
    status: "settled",
    description: `Fatura ${(card as { name: string }).name}`,
    account_id: parsed.data.account_id,
    category_id: null,
    transfer_account_id: null,
    card_id: parsed.data.card_id,
    invoice_month: `${parsed.data.invoice_month}-01`,
  });
  if (error) return { status: "error", message: "Não foi possível registrar o pagamento." };

  revalidatePath("/", "layout");
  return { status: "success", message: "Pagamento registrado" };
}
