"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isISODate, todayISO } from "@/lib/dates";
import { openingPlan, type CardCycle } from "@/lib/finance/cards";
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

type Db = Awaited<ReturnType<typeof createClient>>;

/** Lê os campos de saldo anterior: "opening_current", "opening_per_month", "opening_months". */
function readOpening(formData: FormData):
  | { ok: true; current: number; perMonth: number; months: number }
  | { ok: false; field: string; message: string } {
  const money = (name: string) => {
    const raw = formString(formData, name).trim();
    return raw ? parseMoneyToCents(raw) : 0;
  };
  const current = money("opening_current");
  if (current === null || current < 0) return { ok: false, field: "opening_current", message: "Valor inválido. Ex.: 1200,00" };
  const perMonth = money("opening_per_month");
  if (perMonth === null || perMonth < 0) return { ok: false, field: "opening_per_month", message: "Valor inválido. Ex.: 200,00" };
  const monthsRaw = formString(formData, "opening_months").trim();
  const months = monthsRaw ? Number(monthsRaw) : 0;
  if (!Number.isInteger(months) || months < 0 || months > 47) return { ok: false, field: "opening_months", message: "De 0 a 47 meses" };
  if (perMonth > 0 && months === 0) return { ok: false, field: "opening_months", message: "Em quantas faturas ainda vem a parcela?" };
  return { ok: true, current, perMonth, months };
}

/** Grava o saldo de antes de começar como compras "antes de começar" (RN-41). */
async function insertOpening(
  db: Db,
  userId: string,
  cardId: string,
  cycle: CardCycle,
  opening: { current: number; perMonth: number; months: number },
): Promise<boolean> {
  const plan = openingPlan({ cycle, today: todayISO(), ...opening });
  if (plan.length === 0) return true;
  const group = plan.some((p) => p.number !== null) ? crypto.randomUUID() : null;
  const rows = plan.map((p) => ({
    user_id: userId,
    type: "expense" as const,
    amount: p.amount,
    date: p.date,
    status: "settled" as const,
    description: p.number === null && p.invoiceMonth === plan[0].invoiceMonth && opening.current > 0 ? "Fatura antes do KAIROS" : "Parcelas antes do KAIROS",
    account_id: null,
    category_id: null,
    card_id: cardId,
    invoice_month: `${p.invoiceMonth}-01`,
    before_start: true,
    installment_group_id: p.number !== null ? group : null,
    installment_number: p.number,
    installment_total: p.total,
  }));
  const { error } = await db.from("transactions").insert(rows);
  return !error;
}

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

  const opening = readOpening(formData);
  if (!opening.ok) return { status: "error", message: "Confira os campos.", fieldErrors: { [opening.field]: opening.message } };

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
    const { data, error } = await db.from("credit_cards").insert({ ...fields, user_id: userId }).select("id").single();
    if (error || !data) return { status: "error", message: "Não foi possível criar o cartão." };
    const saved = await insertOpening(db, userId, (data as { id: string }).id, { closingDay: fields.closing_day, dueDay: fields.due_day }, opening);
    if (!saved) return { status: "error", message: "O cartão foi criado, mas não consegui gravar a fatura atual. Use “Informar fatura atual”." };
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

/**
 * Excluir um cartão. mode="archive": só arquiva. mode="delete": apaga o
 * cartão com as compras e os pagamentos de fatura dele.
 */
export async function deleteCardAction(formData: FormData): Promise<void> {
  const id = formString(formData, "id");
  if (!id) return;
  const db = await createClient();
  const now = new Date().toISOString();
  if (formString(formData, "mode") !== "delete") {
    await db.from("credit_cards").update({ archived_at: now }).eq("id", id);
    revalidatePath("/", "layout");
    return;
  }
  await db.from("transactions").update({ deleted_at: now }).eq("card_id", id).is("deleted_at", null);
  await db.from("credit_cards").update({ deleted_at: now }).eq("id", id);
  revalidatePath("/", "layout");
}

/** "Informar fatura atual": saldo de antes de começar num cartão que já existe (RN-41). */
export async function addOpeningBalanceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const cardId = formString(formData, "card_id");
  const opening = readOpening(formData);
  if (!opening.ok) return { status: "error", message: "Confira os campos.", fieldErrors: { [opening.field]: opening.message } };
  if (opening.current === 0 && opening.perMonth === 0) {
    return { status: "error", message: "Confira os campos.", fieldErrors: { opening_current: "Informe o valor da fatura ou das parcelas" } };
  }
  const db = await createClient();
  const { data: card } = await db
    .from("credit_cards")
    .select("id, closing_day, due_day")
    .eq("id", cardId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!card) return { status: "error", message: "Cartão não encontrado." };
  const c = card as { closing_day: number; due_day: number };
  const userId = await requireUserId();
  const saved = await insertOpening(db, userId, cardId, { closingDay: Number(c.closing_day), dueDay: Number(c.due_day) }, opening);
  if (!saved) return { status: "error", message: "Não consegui gravar. Tente de novo." };
  revalidatePath("/", "layout");
  return { status: "success", message: "Fatura atual informada" };
}
