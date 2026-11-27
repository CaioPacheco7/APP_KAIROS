"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseMoneyToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/user";
import type { ActionState } from "./types";
import { fieldErrorsFrom, formString } from "./validation";

const schema = z.object({
  category_id: z.uuid("Escolha a categoria"),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mês inválido"),
  amount: z.string(),
});

/**
 * Define o limite de uma categoria a partir de um mês (RN-12). Vale também
 * para os meses seguintes, até ser trocado. Vazio ou zero tira o limite.
 */
export async function saveBudgetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse({
    category_id: formString(formData, "category_id"),
    month: formString(formData, "month"),
    amount: formString(formData, "amount"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Confira os campos.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const remove = formData.get("remove") === "1";
  const raw = parsed.data.amount.trim();
  const amount = remove || !raw ? 0 : parseMoneyToCents(raw);
  if (amount === null || amount < 0) {
    return { status: "error", message: "Confira os campos.", fieldErrors: { amount: "Valor inválido. Ex.: 600,00" } };
  }

  const db = await createClient();
  const { data: category } = await db
    .from("categories")
    .select("type")
    .eq("id", parsed.data.category_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!category) return { status: "error", message: "Categoria não encontrada." };
  if ((category as { type: string }).type !== "expense") {
    return { status: "error", message: "Orçamento é só para categorias de despesa." };
  }

  const userId = await requireUserId();
  const { error } = await db.from("budgets").upsert(
    { user_id: userId, category_id: parsed.data.category_id, month: `${parsed.data.month}-01`, amount },
    { onConflict: "user_id,category_id,month" },
  );
  if (error) return { status: "error", message: "Não foi possível salvar o limite." };

  revalidatePath("/", "layout");
  return { status: "success", message: amount === 0 ? "Limite removido" : "Limite salvo" };
}
