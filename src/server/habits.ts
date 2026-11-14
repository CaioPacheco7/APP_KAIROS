"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isISODate, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/user";
import type { ActionState } from "./types";
import { fieldErrorsFrom, formString } from "./validation";

const refresh = () => revalidatePath("/", "layout");

const schema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao hábito").max(80, "Máximo de 80 caracteres"),
  weekdays: z
    .array(z.number().int().min(1).max(7))
    .min(1, "Escolha pelo menos um dia da semana"),
});

/** Cria (sem `id`) ou edita (com `id`) um hábito. */
export async function saveHabitAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse({
    name: formString(formData, "name"),
    weekdays: formData
      .getAll("weekdays")
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n)),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Confira os campos.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  // sem repetição e em ordem
  const weekdays = [...new Set(parsed.data.weekdays)].sort((a, b) => a - b);
  const fields = { name: parsed.data.name, weekdays };

  const db = await createClient();
  const id = formString(formData, "id");

  if (id) {
    const { data, error } = await db
      .from("habits")
      .update(fields)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id");
    if (error || !data?.length) {
      return { status: "error", message: "Não foi possível salvar o hábito." };
    }
  } else {
    const userId = await requireUserId();
    const { error } = await db.from("habits").insert({ ...fields, user_id: userId });
    if (error) return { status: "error", message: "Não foi possível criar o hábito." };
  }

  refresh();
  return { status: "success" };
}

/** Marca ou desmarca o hábito num dia (padrão: hoje; nunca no futuro). */
export async function toggleHabitAction(formData: FormData): Promise<void> {
  const habitId = formString(formData, "habit_id");
  const done = formString(formData, "done") === "true";
  const today = todayISO();
  const requested = formString(formData, "date") || today;
  const date = isISODate(requested) && requested <= today ? requested : today;
  if (!habitId) return;

  const db = await createClient();
  if (done) {
    const userId = await requireUserId();
    await db
      .from("habit_logs")
      .upsert(
        { user_id: userId, habit_id: habitId, date },
        { onConflict: "habit_id,date", ignoreDuplicates: true },
      );
  } else {
    await db.from("habit_logs").delete().eq("habit_id", habitId).eq("date", date);
  }
  refresh();
}

/** Arquiva o hábito: some da lista, o histórico fica guardado. */
export async function archiveHabitAction(formData: FormData): Promise<void> {
  const id = formString(formData, "id");
  if (!id) return;
  const db = await createClient();
  await db.from("habits").update({ archived_at: new Date().toISOString() }).eq("id", id);
  refresh();
}
