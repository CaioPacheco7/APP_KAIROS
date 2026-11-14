import { CheckIcon, FlameIcon } from "lucide-react";
import { ConfirmButton } from "@/components/confirm-button";
import { WEEKDAY_SHORT } from "@/lib/habits";
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

/** Uma linha do checklist de hábitos: checkbox, sequência e últimos 7 dias. */
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
    <li className="flex items-center gap-3 py-3">
      <form action={toggleHabitAction}>
        <input type="hidden" name="habit_id" value={habit.id} />
        <input type="hidden" name="date" value={today} />
        <input type="hidden" name="done" value={String(!doneToday)} />
        <button
          type="submit"
          aria-label={doneToday ? `Desmarcar ${habit.name}` : `Marcar ${habit.name} como feito`}
          aria-pressed={doneToday}
          className={cn(
            "flex size-6 items-center justify-center rounded-md border border-input transition-colors hover:border-ring",
            doneToday && "border-primary bg-primary text-primary-foreground",
          )}
        >
          {doneToday && <CheckIcon className="size-4" />}
        </button>
      </form>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", doneToday && "text-muted-foreground line-through")}>
          {habit.name}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FlameIcon className="size-3.5" aria-hidden />
            {habit.streak} {habit.streak === 1 ? "dia" : "dias"} seguidos
          </span>

          <span className="flex items-center gap-1" role="img" aria-label={`Últimos 7 dias: ${habit.days.map((d) => `${DOT_LABEL[d.status]}`).join(", ")}`}>
            {habit.days.map((d) => (
              <span
                key={d.date}
                aria-hidden
                title={`${d.date.slice(8, 10)}/${d.date.slice(5, 7)} · ${DOT_LABEL[d.status]}`}
                className={cn(
                  "size-2.5 rounded-full",
                  d.status === "done" && "bg-primary",
                  d.status === "missed" && "bg-muted-foreground/40",
                  d.status === "open" && "border border-primary",
                  d.status === "off" && "border border-dashed border-border",
                )}
              />
            ))}
          </span>

          {habit.weekdays.length < 7 && (
            <span>{habit.weekdays.map((w) => WEEKDAY_SHORT[w - 1]).join(", ")}</span>
          )}
          {!scheduledToday && <span>não é hoje</span>}
        </div>
      </div>

      {manage && (
        <div className="flex items-center">
          <HabitEditDialog habit={{ id: habit.id, name: habit.name, weekdays: habit.weekdays }} />
          <form action={archiveHabitAction}>
            <input type="hidden" name="id" value={habit.id} />
            <ConfirmButton
              message={`Arquivar "${habit.name}"? Ele some da lista, mas o histórico é mantido.`}
              variant="ghost"
              size="sm"
            >
              Arquivar
            </ConfirmButton>
          </form>
        </div>
      )}
    </li>
  );
}
