import { cache } from "react";
import { addDays, todayISO } from "@/lib/dates";
import {
  currentStreak,
  habitStrength,
  habitYear,
  isScheduled,
  recentDays,
  type DayStatus,
  type YearWeek,
} from "@/lib/habits";
import { createClient } from "@/lib/supabase/server";

export type HabitCard = {
  id: string;
  name: string;
  weekdays: number[];
  scheduledToday: boolean;
  doneToday: boolean;
  streak: number;
  /** força do hábito, de 0 a 1 (não zera com uma falta) */
  strength: number;
  days: Array<{ date: string; status: DayStatus }>;
};

type HabitHistory = {
  id: string;
  name: string;
  weekdays: number[];
  createdOn: string;
  done: Set<string>;
};

/** O banco devolve no máximo 1.000 linhas por pedido: busca o histórico em páginas. */
const PAGE = 1000;

/** Hábitos ativos com as datas em que foram feitos (últimos 400 dias). Uma busca por requisição. */
const loadHabits = cache(async (today: string): Promise<HabitHistory[]> => {
  const db = await createClient();
  const since = addDays(today, -400);

  const habitsReq = db
    .from("habits")
    .select("id, name, weekdays, created_at")
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  const logs: { habit_id: string; date: string }[] = [];
  const fetchLogs = async () => {
    for (let from = 0; ; from += PAGE) {
      const { data } = await db
        .from("habit_logs")
        .select("habit_id, date")
        .gte("date", since)
        .order("date", { ascending: true })
        .order("habit_id", { ascending: true })
        .range(from, from + PAGE - 1);
      const rows = (data ?? []) as { habit_id: string; date: string }[];
      logs.push(...rows);
      if (rows.length < PAGE) break;
    }
  };

  const [habitsRes] = await Promise.all([habitsReq, fetchLogs()]);

  const doneByHabit = new Map<string, Set<string>>();
  for (const log of logs) {
    const set = doneByHabit.get(log.habit_id) ?? new Set<string>();
    set.add(log.date);
    doneByHabit.set(log.habit_id, set);
  }

  return ((habitsRes.data ?? []) as {
    id: string;
    name: string;
    weekdays: number[];
    created_at: string;
  }[]).map((h) => ({
    id: h.id,
    name: h.name,
    weekdays: h.weekdays,
    createdOn: todayISO(new Date(h.created_at)),
    done: doneByHabit.get(h.id) ?? new Set<string>(),
  }));
});

/** Hábitos ativos com sequência, força e últimos 7 dias, prontos para a tela. */
export async function getHabitBoard(today: string): Promise<HabitCard[]> {
  const habits = await loadHabits(today);
  return habits.map((h) => ({
    id: h.id,
    name: h.name,
    weekdays: h.weekdays,
    scheduledToday: isScheduled(h.weekdays, today),
    doneToday: h.done.has(today),
    streak: currentStreak(h.weekdays, h.done, today),
    strength: habitStrength(h.weekdays, h.done, today, h.createdOn),
    days: recentDays(h.weekdays, h.done, today, 7, h.createdOn),
  }));
}

/** Mapa do ano dos hábitos ativos: semanas de segunda a domingo até hoje. */
export async function getHabitYear(today: string, weeks = 53): Promise<YearWeek[]> {
  return habitYear(await loadHabits(today), today, weeks);
}

/** Resumo do dia para a tela Início: quantos hábitos previstos hoje e quantos feitos. */
export function summarizeToday(board: HabitCard[]) {
  const scheduled = board.filter((h) => h.scheduledToday);
  return {
    total: scheduled.length,
    done: scheduled.filter((h) => h.doneToday).length,
  };
}
