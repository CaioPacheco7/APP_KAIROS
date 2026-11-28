"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_REMINDER_TIME, parseCapture, type Intent } from "@/lib/capture/parse";
import { repeatLabel } from "@/lib/reminders";
import { formatDayMonth, todayISO } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/user";
import { insertTransaction, type Db } from "./core/transactions";
import type { ActionState } from "./types";
import { emptyToNull, formString } from "./validation";

type Reply = {
  content: string;
  entity?: { type: "transaction" | "task" | "note"; id: string };
};

const dateLabel = (date: string, today: string) =>
  date === today ? "hoje" : formatDayMonth(date);

async function execute(
  db: Db,
  userId: string,
  intent: Intent,
  accountId: string | null,
  today: string,
): Promise<Reply> {
  switch (intent.kind) {
    case "unknown":
      return { content: intent.message };

    case "transaction": {
      if (!accountId) {
        return {
          content:
            "Para lançar gastos e receitas, configure antes as suas finanças na aba Finanças.",
        };
      }
      const { data: account } = await db
        .from("accounts")
        .select("name")
        .eq("id", accountId)
        .is("deleted_at", null)
        .is("archived_at", null)
        .maybeSingle();
      if (!account) return { content: "Não encontrei essa conta." };

      let categoryId: string | null = null;
      let categoryName: string | null = null;
      if (intent.categoryHint) {
        const { data: category } = await db
          .from("categories")
          .select("id, name")
          .eq("name", intent.categoryHint)
          .eq("type", intent.type)
          .is("deleted_at", null)
          .is("archived_at", null)
          .limit(1)
          .maybeSingle();
        categoryId = category?.id ?? null;
        categoryName = category?.name ?? null;
      }

      const status = intent.date <= today ? "settled" : "pending";
      const result = await insertTransaction(db, userId, {
        type: intent.type,
        amount: intent.amount,
        date: intent.date,
        status,
        description: intent.description,
        account_id: accountId,
        category_id: categoryId,
        transfer_account_id: null,
      });
      if ("error" in result) return { content: result.error };

      const parts = [
        `${intent.type === "income" ? "Receita" : "Despesa"} de ${formatBRL(intent.amount)}`,
        categoryName ?? "sem categoria",
        account.name as string,
        dateLabel(intent.date, today) + (status === "pending" ? " (agendada)" : ""),
      ];
      return {
        content: `Registrei: ${parts.join(" · ")}`,
        entity: { type: "transaction", id: result.id },
      };
    }

    case "task": {
      const { data, error } = await db
        .from("tasks")
        .insert({
          user_id: userId,
          kind: "task",
          title: intent.title,
          due_date: intent.dueDate,
        })
        .select("id")
        .single();
      if (error || !data) return { content: "Não consegui criar a tarefa." };
      return {
        content: `Tarefa criada: ${intent.title}${
          intent.dueDate ? ` · prazo ${formatDayMonth(intent.dueDate)}` : " · sem prazo"
        }. Se quiser um aviso no celular, escreva “lembrar de … amanhã 9h”.`,
        entity: { type: "task", id: data.id as string },
      };
    }

    case "reminder": {
      // Lembrete fixo: repete nos dias escolhidos, no horário (sem data)
      if (intent.repeat) {
        const time = intent.time ?? DEFAULT_REMINDER_TIME;
        const { data, error } = await db
          .from("tasks")
          .insert({
            user_id: userId,
            kind: "reminder",
            title: intent.title,
            repeat_weekdays: intent.repeat,
            remind_time: time,
          })
          .select("id")
          .single();
        if (error || !data) return { content: "Não consegui criar o lembrete fixo." };
        return {
          content: `Lembrete fixo criado: ${intent.title} · ${repeatLabel(intent.repeat, time)}${
            intent.time ? "" : " (mude o horário em Rotina → Lembretes)"
          }. Ative as notificações em Rotina → Lembretes para o celular avisar.`,
          entity: { type: "task", id: data.id as string },
        };
      }
      // Brasil não tem horário de verão desde 2019: UTC-3 fixo.
      const remindAt = intent.time
        ? `${intent.date}T${intent.time}:00-03:00`
        : null;
      const { data, error } = await db
        .from("tasks")
        .insert({
          user_id: userId,
          kind: "reminder",
          title: intent.title,
          due_date: intent.date,
          remind_at: remindAt,
        })
        .select("id")
        .single();
      if (error || !data) return { content: "Não consegui criar o lembrete." };
      return {
        content: `Lembrete criado: ${intent.title} · ${dateLabel(intent.date, today)}${
          intent.time ? ` às ${intent.time}` : ""
        }`,
        entity: { type: "task", id: data.id as string },
      };
    }

    case "note": {
      const { data, error } = await db
        .from("notes")
        .insert({ user_id: userId, title: "", body: intent.text })
        .select("id")
        .single();
      if (error || !data) return { content: "Não consegui salvar a nota." };
      return {
        content: "Nota salva no bloco de notas.",
        entity: { type: "note", id: data.id as string },
      };
    }
  }
}

export async function sendChatMessageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const text = formString(formData, "text").trim();
  if (!text) return { status: "error", message: "Escreva alguma coisa." };
  if (text.length > 500) {
    return { status: "error", message: "Mensagem longa demais (máx. 500)." };
  }

  const db = await createClient();
  const userId = await requireUserId();
  const today = todayISO();
  const accountId = emptyToNull(formString(formData, "account_id"));

  const reply = await execute(
    db,
    userId,
    parseCapture(text, today),
    accountId,
    today,
  );

  // Horários explícitos, 1 ms de diferença, para manter a ordem na conversa.
  const now = Date.now();
  const { error } = await db.from("chat_messages").insert([
    {
      user_id: userId,
      role: "user",
      content: text,
      created_at: new Date(now).toISOString(),
    },
    {
      user_id: userId,
      role: "assistant",
      content: reply.content,
      entity_type: reply.entity?.type ?? null,
      entity_id: reply.entity?.id ?? null,
      created_at: new Date(now + 1).toISOString(),
    },
  ]);
  if (error) {
    return { status: "error", message: "Não foi possível salvar a conversa." };
  }

  revalidatePath("/", "layout");
  // A resposta volta para quem chamou (ex.: a busca mostra num aviso).
  return { status: "success", message: reply.content };
}

const ENTITY_TABLE = {
  transaction: "transactions",
  task: "tasks",
  note: "notes",
} as const;

/** Desfaz o que o chat criou (exclusão lógica da entidade). */
export async function undoChatMessageAction(formData: FormData): Promise<void> {
  const id = formString(formData, "id");
  if (!id) return;

  const db = await createClient();
  const { data: message } = await db
    .from("chat_messages")
    .select("entity_type, entity_id, undone_at")
    .eq("id", id)
    .maybeSingle();
  if (!message?.entity_type || !message.entity_id || message.undone_at) return;

  const now = new Date().toISOString();
  await db
    .from(ENTITY_TABLE[message.entity_type as keyof typeof ENTITY_TABLE])
    .update({ deleted_at: now })
    .eq("id", message.entity_id);
  await db.from("chat_messages").update({ undone_at: now }).eq("id", id);

  revalidatePath("/", "layout");
}
