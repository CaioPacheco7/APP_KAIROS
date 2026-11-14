import { addDays, todayISO } from "@/lib/dates";
import {
  currentStreak,
  isScheduled,
  recentDays,
  type DayStatus,
} from "@/lib/habits";
import { createClient } from "@/lib/supabase/server";

export type HabitCard = {
  id: string;
  name: string;
  weekdays: number[];
  scheduledToday: boolean;
  doneToday: boolean;
  streak: number;
  days: Array<{ date: string; status: DayStatus }>;
};

/** Hábitos ativos com sequência e últimos 7 dias, prontos para a tela. */
export async function getHabitBoard(today: string): Promise<HabitCard[]> {
  const db = await createClient();
  const since = addDays(today, -400);

  const [habitsRes, logsRes] = await Promise.all([
    db
      .from("habits")
      .select("id, name, weekdays, created_at")
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("created_at", { ascending: true }),
    db.from("habit_logs").select("habit_id, date").gte("date", since),
  ]);

  const doneByHabit = new Map<string, Set<string>>();
  for (const log of (logsRes.data ?? []) as { habit_id: string; date: string }[]) {
    const set = doneByHabit.get(log.habit_id) ?? new Set<string>();
    set.add(log.date);
    doneByHabit.set(log.habit_id, set);
  }

  return ((habitsRes.data ?? []) as {
    id: string;
    name: string;
    weekdays: number[];
    created_at: string;
  }[]).map((h) => {
    const done = doneByHabit.get(h.id) ?? new Set<string>();
    const createdOn = todayISO(new Date(h.created_at));
    return {
      id: h.id,
      name: h.name,
      weekdays: h.weekdays,
      scheduledToday: isScheduled(h.weekdays, today),
      doneToday: done.has(today),
      streak: currentStreak(h.weekdays, done, today),
      days: recentDays(h.weekdays, done, today, 7, createdOn),
    };
  });
}

/** Resumo do dia para a tela Início: quantos hábitos previstos hoje e quantos feitos. */
export function summarizeToday(board: HabitCard[]) {
  const scheduled = board.filter((h) => h.scheduledToday);
  return {
    total: scheduled.length,
    done: scheduled.filter((h) => h.doneToday).length,
  };
}
