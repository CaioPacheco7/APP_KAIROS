"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isISODate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/user";
import type { ActionState } from "./types";
import { emptyToNull, fieldErrorsFrom, formString } from "./validation";

const refresh = () => revalidatePath("/", "layout");

// ---------------------------------------------------------------------
// Tarefas e lembretes
// ---------------------------------------------------------------------

const taskSchema = z.object({
  kind: z.enum(["task", "reminder"]),
  title: z.string().trim().min(1, "Informe o título").max(160, "Máximo de 160 caracteres"),
  due_date: z
    .string()
    .optional()
    .refine((v) => !v || isISODate(v), "Data inválida"),
  time: z
    .string()
    .optional()
    .refine((v) => !v || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), "Hora inválida"),
  priority: z.enum(["low", "normal", "high"]),
});

export async function saveTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = taskSchema.safeParse({
    kind: formString(formData, "kind") || "task",
    title: formString(formData, "title"),
    due_date: formString(formData, "due_date"),
    time: formString(formData, "time"),
    priority: formString(formData, "priority") || "normal",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Confira os campos.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const { kind, title, priority } = parsed.data;
  const due_date = emptyToNull(parsed.data.due_date);
  const time = emptyToNull(parsed.data.time);

  if (kind === "reminder" && !due_date) {
    return {
      status: "error",
      message: "Confira os campos.",
      fieldErrors: { due_date: "Escolha o dia do lembrete" },
    };
  }

  const fields = {
    kind,
    title,
    priority,
    due_date,
    // Brasil: UTC-3 fixo (sem horário de verão desde 2019)
    remind_at: kind === "reminder" && due_date && time ? `${due_date}T${time}:00-03:00` : null,
  };

  const db = await createClient();
  const id = formString(formData, "id");
  if (id) {
    const { data, error } = await db
      .from("tasks")
      .update(fields)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id");
    if (error || !data?.length) {
      return { status: "error", message: "Não foi possível salvar." };
    }
  } else {
    const userId = await requireUserId();
    const { error } = await db.from("tasks").insert({ ...fields, user_id: userId });
    if (error) return { status: "error", message: "Não foi possível criar." };
  }

  refresh();
  return { status: "success" };
}

export async function toggleTaskAction(formData: FormData): Promise<void> {
  const id = formString(formData, "id");
  const done = formString(formData, "done") === "true";
  if (!id) return;
  const db = await createClient();
  await db
    .from("tasks")
    .update(
      done
        ? { status: "done", completed_at: new Date().toISOString() }
        : { status: "open", completed_at: null },
    )
    .eq("id", id);
  refresh();
}

export async function deleteTaskAction(formData: FormData): Promise<void> {
  const id = formString(formData, "id");
  if (!id) return;
  const db = await createClient();
  await db.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  refresh();
}

// ---------------------------------------------------------------------
// Notas
// ---------------------------------------------------------------------

const noteSchema = z
  .object({
    title: z.string().trim().max(120, "Máximo de 120 caracteres"),
    body: z.string().max(20000, "Texto longo demais"),
  })
  .refine((v) => v.title || v.body.trim(), {
    message: "Escreva um título ou um texto",
    path: ["body"],
  });

export async function saveNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = noteSchema.safeParse({
    title: formString(formData, "title"),
    body: formString(formData, "body"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Confira os campos.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const db = await createClient();
  const id = formString(formData, "id");
  if (id) {
    const { data, error } = await db
      .from("notes")
      .update(parsed.data)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id");
    if (error || !data?.length) {
      return { status: "error", message: "Não foi possível salvar a nota." };
    }
  } else {
    const userId = await requireUserId();
    const { error } = await db.from("notes").insert({ ...parsed.data, user_id: userId });
    if (error) return { status: "error", message: "Não foi possível criar a nota." };
  }

  refresh();
  return { status: "success" };
}

export async function deleteNoteAction(formData: FormData): Promise<void> {
  const id = formString(formData, "id");
  if (!id) return;
  const db = await createClient();
  await db.from("notes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  refresh();
}

export async function toggleNotePinAction(formData: FormData): Promise<void> {
  const id = formString(formData, "id");
  const pinned = formString(formData, "pinned") === "true";
  if (!id) return;
  const db = await createClient();
  await db.from("notes").update({ pinned }).eq("id", id);
  refresh();
}
