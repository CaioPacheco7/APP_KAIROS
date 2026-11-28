"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { categoryHintFor } from "@/lib/capture/parse";
import { todayISO } from "@/lib/dates";
import { parseMoneyToCents } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { setOnboardedCookie } from "./core/onboarding-cookie";
import type { ActionState } from "./types";
import { fieldErrorsFrom, formString } from "./validation";

const fixedItem = z.object({
  description: z.string().trim().min(1, "Dê um nome à conta").max(60),
  amount: z.string().trim().min(1, "Informe o valor"),
  day: z.coerce.number().int().min(1, "Dia de 1 a 31").max(31, "Dia de 1 a 31"),
  /** já pago neste mês, antes de começar a usar o app (RN-39) */
  paid: z.boolean().optional(),
});

const schema = z.object({
  name: z.string().trim().min(1, "Como devo te chamar?").max(60),
  income: z.string().trim().min(1, "Informe a sua renda mensal"),
  income_day: z.coerce.number().int().min(1, "Dia de 1 a 31").max(31, "Dia de 1 a 31"),
  account_name: z.string().trim().max(60).optional(),
  balance: z.string().trim().optional(),
});

export async function completeInterviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse({
    name: formString(formData, "name"),
    income: formString(formData, "income"),
    income_day: formString(formData, "income_day"),
    account_name: formString(formData, "account_name"),
    balance: formString(formData, "balance"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Confira os campos.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const income = parseMoneyToCents(parsed.data.income);
  if (income === null || income <= 0) {
    return {
      status: "error",
      message: "Confira os campos.",
      fieldErrors: { income: "Valor inválido. Ex.: 2500,00" },
    };
  }

  const accountName = parsed.data.account_name?.trim() || null;
  const balanceRaw = parsed.data.balance?.trim();
  const balance = balanceRaw ? parseMoneyToCents(balanceRaw, { allowNegative: true }) : 0;
  if (balance === null) {
    return {
      status: "error",
      message: "Confira os campos.",
      fieldErrors: { balance: "Valor inválido. Ex.: 1500,00" },
    };
  }

  // Contas fixas (JSON vindo do assistente)
  let rawFixed: unknown = [];
  try {
    rawFixed = JSON.parse(formString(formData, "fixed") || "[]");
  } catch {
    return { status: "error", message: "Não consegui ler as contas fixas." };
  }
  const fixedParsed = z.array(fixedItem).max(40).safeParse(rawFixed);
  if (!fixedParsed.success) {
    return {
      status: "error",
      message: "Confira as contas fixas: nome, valor e dia de vencimento.",
    };
  }

  const fixed: Array<{ description: string; amount: number; day: number; category: string | null; paid: boolean }> = [];
  for (const item of fixedParsed.data) {
    const amount = parseMoneyToCents(item.amount);
    if (amount === null || amount <= 0) {
      return {
        status: "error",
        message: `Valor inválido em "${item.description}". Ex.: 300,00`,
      };
    }
    fixed.push({
      description: item.description,
      amount,
      day: item.day,
      category: categoryHintFor(item.description, "expense"),
      paid: item.paid === true,
    });
  }

  const db = await createClient();
  const { error } = await db.rpc("complete_interview", {
    p_name: parsed.data.name,
    p_income: income,
    p_income_day: parsed.data.income_day,
    p_account_name: accountName,
    p_balance: balance,
    p_fixed: fixed,
    p_month: `${todayISO().slice(0, 7)}-01`,
    p_income_paid: formString(formData, "income_paid") === "true",
  });

  if (error) {
    // "Entrevista já concluída": só garante o cookie e segue.
    if (error.message.includes("já concluída")) {
      await setOnboardedCookie();
      revalidatePath("/", "layout");
      return { status: "success" };
    }

    // O motivo real fica no log do servidor (o usuário só vê a mensagem amigável).
    console.error("[entrevista] complete_interview falhou:", error.code, error.message);

    // PGRST202 / 42883: a função não existe, ou seja, a migration não foi rodada.
    if (error.code === "PGRST202" || error.code === "42883") {
      return {
        status: "error",
        message:
          "O banco ainda não tem a migration da entrevista. Rode as migrations de supabase/migrations/ no SQL Editor do Supabase, em ordem, e tente de novo.",
      };
    }
    return { status: "error", message: "Não foi possível concluir a entrevista. Tente de novo." };
  }

  await setOnboardedCookie();
  revalidatePath("/", "layout");
  return { status: "success" };
}
