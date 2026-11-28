"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { shiftMonth, todayISO } from "@/lib/dates";
import { parseMoneyToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/user";
import type { ActionState } from "./types";
import { emptyToNull, fieldErrorsFrom, formString } from "./validation";

const schema = z.object({
  kind: z.enum(["income", "expense"], { message: "Escolha o tipo" }),
  description: z.string().trim().min(1, "Dê um nome").max(60, "Máximo de 60 caracteres"),
  amount: z.string().trim().min(1, "Informe o valor"),
  day: z.coerce.number().int().min(1, "Dia de 1 a 31").max(31, "Dia de 1 a 31"),
  account_id: z.uuid("Escolha a conta"),
  category_id: z.string().optional(),
});

const refresh = () => revalidatePath("/", "layout");

/** Primeiro dia do mês atual (no fuso de São Paulo): "2026-11-01". */
const currentMonthStart = () => `${todayISO().slice(0, 7)}-01`;

/** Primeiro dia do mês seguinte: "2026-12-01". */
const nextMonthStart = () => `${shiftMonth(todayISO().slice(0, 7), 1)}-01`;

/** Cria (sem `id`) ou edita (com `id`) uma conta fixa / entrada recorrente. */
export async function saveRecurrenceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse({
    kind: formString(formData, "kind"),
    description: formString(formData, "description"),
    amount: formString(formData, "amount"),
    day: formString(formData, "day"),
    account_id: formString(formData, "account_id"),
    category_id: formString(formData, "category_id"),
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
      fieldErrors: { amount: "Valor inválido. Ex.: 300,00" },
    };
  }

  const fields = {
    kind: parsed.data.kind,
    description: parsed.data.description,
    amount,
    day_of_month: parsed.data.day,
    account_id: parsed.data.account_id,
    category_id: emptyToNull(parsed.data.category_id),
  };

  const db = await createClient();
  const id = formString(formData, "id");

  if (id) {
    const { data, error } = await db
      .from("recurrences")
      .update(fields)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id");
    if (error || !data?.length) {
      return { status: "error", message: "Não foi possível salvar." };
    }
    // Só as instâncias pendentes do mês atual em diante mudam (RN-13).
    await db.rpc("apply_recurrence_changes", {
      p_id: id,
      p_from: currentMonthStart(),
    });
  } else {
    const userId = await requireUserId();
    const startNextMonth = formString(formData, "start_next_month") === "on";
    const { error } = await db.from("recurrences").insert({
      ...fields,
      user_id: userId,
      starts_on: startNextMonth ? nextMonthStart() : currentMonthStart(),
    });
    if (error) return { status: "error", message: "Não foi possível criar." };
    await db.rpc("generate_recurring_transactions", { p_month: currentMonthStart() });
  }

  refresh();
  return { status: "success" };
}

/** Encerra a conta fixa: as pendentes daqui para frente somem; o histórico fica. */
export async function removeRecurrenceAction(formData: FormData): Promise<void> {
  const id = formString(formData, "id");
  if (!id) return;
  const db = await createClient();
  await db.rpc("remove_recurrence", { p_id: id, p_from: currentMonthStart() });
  refresh();
}

/**
 * "Paguei" / "Recebi" e o desfazer: alterna pendente <-> efetivada.
 * before_start="true": foi pago/recebido antes de começar a usar o app (RN-39),
 * então não mexe no saldo informado na entrevista.
 */
export async function setPaidAction(formData: FormData): Promise<void> {
  const id = formString(formData, "id");
  const paid = formString(formData, "paid") === "true";
  const beforeStart = paid && formString(formData, "before_start") === "true";
  if (!id) return;
  const db = await createClient();
  await db
    .from("transactions")
    .update({ status: paid ? "settled" : "pending", before_start: beforeStart })
    .eq("id", id)
    .is("deleted_at", null);
  refresh();
}
