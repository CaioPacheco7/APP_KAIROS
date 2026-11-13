"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseMoneyToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/user";
import type { ActionState } from "./types";
import { fieldErrorsFrom, formString } from "./validation";

const schema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(60, "Máximo de 60 caracteres"),
  type: z.enum(["checking", "savings", "wallet", "investment"], {
    message: "Escolha o tipo",
  }),
  initial_balance: z.string(),
});

/** Cria (sem `id`) ou edita (com `id`) uma conta. */
export async function saveAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse({
    name: formString(formData, "name"),
    type: formString(formData, "type"),
    initial_balance: formString(formData, "initial_balance"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Confira os campos.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  // Saldo inicial pode ser negativo (cheque especial) e vazio vale zero.
  const rawBalance = parsed.data.initial_balance.trim();
  const initial_balance = rawBalance
    ? parseMoneyToCents(rawBalance, { allowNegative: true })
    : 0;
  if (initial_balance === null) {
    return {
      status: "error",
      message: "Confira os campos.",
      fieldErrors: { initial_balance: "Valor inválido. Ex.: 1500,00" },
    };
  }

  const db = await createClient();
  const id = formString(formData, "id");
  const fields = {
    name: parsed.data.name,
    type: parsed.data.type,
    initial_balance,
  };

  if (id) {
    const { data, error } = await db
      .from("accounts")
      .update(fields)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id");
    if (error || !data?.length) {
      return { status: "error", message: "Não foi possível salvar a conta." };
    }
  } else {
    const userId = await requireUserId();
    const { error } = await db
      .from("accounts")
      .insert({ ...fields, user_id: userId });
    if (error) {
      return { status: "error", message: "Não foi possível criar a conta." };
    }
  }

  revalidatePath("/", "layout");
  return { status: "success" };
}

/** Arquiva uma conta: some das telas, mas o histórico fica. */
export async function archiveAccountAction(formData: FormData): Promise<void> {
  const id = formString(formData, "id");
  if (!id) return;
  const db = await createClient();
  await db
    .from("accounts")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/", "layout");
}
