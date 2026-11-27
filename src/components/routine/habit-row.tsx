import { ArchiveIcon, CheckIcon, FlameIcon } from "lucide-react";
import { ConfirmButton } from "@/components/confirm-button";
import { strengthLabel, WEEKDAY_SHORT } from "@/lib/habits";
import { cn } from "@/lib/utils";
import { archiveHabitAction, toggleHabitAction } from "@/server/habits";
import type { HabitCard } from "@/server/habits-board";
import { HabitEditDialog } from "./habit-edit-dialog";

const DOT_LABEL = {
  done: "feito",
  missed: "não feito",
  off: "fora da agenda",
  open: "hoje, em aberto",
} as const;

/** Uma linha do checklist de hábitos: checkbox grande, sequência e últimos 7 dias. */
export function HabitRow({
  habit,
  today,
  manage = true,
}: {
  habit: HabitCard;
  today: string;
  manage?: boolean;
}) {
  const { doneToday, scheduledToday } = habit;

  return (
    <li className="group/habit flex items-center gap-4 py-3.5">
      <form action={toggleHabitAction}>
        <input type="hidden" name="habit_id" value={habit.id} />
        <input type="hidden" name="date" value={today} />
        <input type="hidden" name="done" value={String(!doneToday)} />
        <button
          type="submit"
          aria-label={doneToday ? `Desmarcar ${habit.name}` : `Marcar ${habit.name} como feito`}
          aria-pressed={doneToday}
          className={cn(
            "relative grid size-9 place-items-center rounded-full border-2 transition-all duration-200 outline-none pointer-coarse:size-10 pointer-coarse:after:absolute pointer-coarse:after:-inset-1 pointer-coarse:after:rounded-full pointer-coarse:after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            doneToday
              ? "border-(--series-habit) bg-(--series-habit) text-[#fffaf0] shadow-[0_6px_16px_-8px_var(--series-habit)] dark:text-[#22180a]"
              : "border-input bg-inner hover:border-(--series-habit) hover:bg-gold-soft",
          )}
        >
          {doneToday && <CheckIcon className="size-5" strokeWidth={3} />}
        </button>
      </form>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[0.875rem] font-bold", doneToday && "text-muted-foreground line-through decoration-muted-foreground/50")}>
          {habit.name}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span
            className="flex items-center gap-1.5"
            role="img"
            aria-label={`Últimos 7 dias: ${habit.days.map((d) => DOT_LABEL[d.status]).join(", ")}`}
          >
            {habit.days.map((d) => (
              <span
                key={d.date}
                aria-hidden
                title={`${d.date.slice(8, 10)}/${d.date.slice(5, 7)} · ${DOT_LABEL[d.status]}`}
                className={cn(
                  "size-2.5 rounded-full",
                  d.status === "done" && "bg-(--series-habit)",
                  d.status === "missed" && "bg-track",
                  d.status === "open" && "ring-[1.5px] ring-(--series-habit) ring-inset",
                  d.status === "off" && "border border-dashed border-line",
                )}
              />
            ))}
          </span>
          {/* força: cai devagar com uma falta, em vez de zerar como a sequência */}
          <span
            className="flex items-center gap-1.5"
            title="Força do hábito: sobe com a constância e cai devagar quando você falha, sem zerar"
          >
            <span aria-hidden className="h-1.5 w-7 overflow-hidden rounded-full bg-gold-soft">
              <span
                className="block h-full rounded-full bg-(--series-habit)"
                style={{ width: `${Math.max(Math.round(habit.strength * 100), habit.strength > 0 ? 6 : 0)}%` }}
              />
            </span>
            <span>
              força {Math.round(habit.strength * 100)}%
              <span className="max-sm:sr-only"> · {strengthLabel(habit.strength)}</span>
            </span>
          </span>
          {habit.weekdays.length < 7 && (
            <span>{habit.weekdays.map((w) => WEEKDAY_SHORT[w - 1]).join(", ")}</span>
          )}
          {!scheduledToday && <span>não é hoje</span>}
        </div>
      </div>

      {habit.streak > 0 && (
        <span
          className="hidden shrink-0 items-center gap-1 rounded-full bg-gold-soft px-2.5 py-1 text-xs font-medium text-gold sm:flex"
          title={`${habit.streak} ${habit.streak === 1 ? "dia" : "dias"} seguidos`}
        >
          <FlameIcon className="size-3.5" aria-hidden />
          {habit.streak} {habit.streak === 1 ? "dia" : "dias"}
        </span>
      )}

      {manage && (
        <div className="flex shrink-0 items-center transition-opacity md:opacity-0 md:group-focus-within/habit:opacity-100 md:group-hover/habit:opacity-100">
          <HabitEditDialog habit={{ id: habit.id, name: habit.name, weekdays: habit.weekdays }} />
          <form action={archiveHabitAction}>
            <input type="hidden" name="id" value={habit.id} />
            <ConfirmButton
              message={`Arquivar "${habit.name}"? Ele some da lista, mas o histórico é mantido.`}
              variant="ghost"
              size="sm"
              className="text-muted-foreground max-sm:px-2"
            >
              <ArchiveIcon className="sm:hidden" aria-hidden />
              <span className="max-sm:sr-only">Arquivar</span>
            </ConfirmButton>
          </form>
        </div>
      )}
    </li>
  );
}
