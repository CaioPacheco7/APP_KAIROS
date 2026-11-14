"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isISODate, todayISO } from "@/lib/dates";
import { parseMoneyToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/user";
import { insertTransaction } from "./core/transactions";
import type { ActionState } from "./types";
import { emptyToNull, fieldErrorsFrom, formString } from "./validation";

const refresh = () => revalidatePath("/", "layout");

/** "10", "10,5", "1.5" -> número; vazio/inválido -> null */
function parsePct(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 1000 ? n : null;
}

const createSchema = z.object({
  kind: z.enum(["purchase", "debt"]),
  title: z.string().trim().min(1, "Dê um nome ao plano").max(80, "Máximo de 80 caracteres"),
  target: z.string().trim().min(1, "Informe o valor"),
  monthly: z.string().trim().min(1, "Informe o valor mensal"),
  months: z.string().optional(),
});

/** Salva um plano escolhido no simulador. */
export async function createGoalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createSchema.safeParse({
    kind: formString(formData, "kind"),
    title: formString(formData, "title"),
    target: formString(formData, "target"),
    monthly: formString(formData, "monthly"),
    months: formString(formData, "months"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Confira os campos.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const target = parseMoneyToCents(parsed.data.target);
  const monthly = parseMoneyToCents(parsed.data.monthly);
  if (target === null || target <= 0 || monthly === null || monthly <= 0) {
    return { status: "error", message: "Os valores do plano precisam ser maiores que zero." };
  }

  const monthsRaw = emptyToNull(parsed.data.months);
  const months = monthsRaw ? Number(monthsRaw) : null;
  if (months !== null && (!Number.isInteger(months) || months < 1 || months > 1200)) {
    return { status: "error", message: "Prazo inválido." };
  }

  const rate = parsePct(formString(formData, "rate")) ?? 0;
  const saved = parsed.data.kind === "purchase"
    ? parseMoneyToCents(formString(formData, "saved") || "0")
    : 0;
  if (saved === null) {
    return { status: "error", message: "O valor já guardado é inválido." };
  }

  const db = await createClient();
  const userId = await requireUserId();

  const { data: goal, error } = await db
    .from("goals")
    .insert({
      user_id: userId,
      kind: parsed.data.kind,
      title: parsed.data.title,
      target_amount: target,
      monthly_amount: monthly,
      months_planned: months,
      rate_pct_month: rate,
    })
    .select("id")
    .single();
  if (error || !goal) return { status: "error", message: "Não foi possível salvar o plano." };

  // O que já estava guardado vira o primeiro aporte.
  if (saved > 0) {
    await db.from("goal_contributions").insert({
      user_id: userId,
      goal_id: goal.id,
      amount: saved,
      date: todayISO(),
      note: "Valor que já estava guardado",
    });
  }

  refresh();
  return { status: "success" };
}

const contributionSchema = z.object({
  goal_id: z.uuid("Plano inválido"),
  amount: z.string().trim().min(1, "Informe o valor"),
  date: z.string().refine(isISODate, "Data inválida"),
});

/** Registra um aporte (meta) ou pagamento (dívida) no plano. */
export async function addContributionAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = contributionSchema.safeParse({
    goal_id: formString(formData, "goal_id"),
    amount: formString(formData, "amount"),
    date: formString(formData, "date") || todayISO(),
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

  const db = await createClient();
  const userId = await requireUserId();

  const { data: goal } = await db
    .from("goals")
    .select("id, kind, title, target_amount")
    .eq("id", parsed.data.goal_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!goal) return { status: "error", message: "Plano não encontrado." };

  const { error } = await db.from("goal_contributions").insert({
    user_id: userId,
    goal_id: goal.id,
    amount,
    date: parsed.data.date,
  });
  if (error) return { status: "error", message: "Não foi possível registrar." };

  // Pagamento de dívida pode virar também uma despesa na conta (evita lançar duas vezes).
  const accountId = emptyToNull(formString(formData, "account_id"));
  if (goal.kind === "debt" && formData.get("also_expense") === "on" && accountId) {
    const { data: category } = await db
      .from("categories")
      .select("id")
      .eq("name", "Outras despesas")
      .eq("type", "expense")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    const result = await insertTransaction(db, userId, {
      type: "expense",
      amount,
      date: parsed.data.date,
      status: parsed.data.date <= todayISO() ? "settled" : "pending",
      description: `Pagamento: ${goal.title}`,
      account_id: accountId,
      category_id: category?.id ?? null,
      transfer_account_id: null,
    });
    if ("error" in result) {
      return { status: "error", message: `Aporte salvo, mas a despesa falhou: ${result.error}` };
    }
  }

  // Concluiu o plano?
  const { data: progress } = await db
    .from("v_goal_progress")
    .select("contributed")
    .eq("goal_id", goal.id)
    .maybeSingle();
  if (progress && Number(progress.contributed) >= Number(goal.target_amount)) {
    await db.from("goals").update({ status: "done" }).eq("id", goal.id);
  }

  refresh();
  return { status: "success" };
}

export async function deleteGoalAction(formData: FormData): Promise<void> {
  const id = formString(formData, "id");
  if (!id) return;
  const db = await createClient();
  await db.from("goals").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  refresh();
}
