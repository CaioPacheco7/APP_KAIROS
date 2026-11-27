import { CheckIcon, ClockIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTimeBR } from "@/lib/dates";
import { relativeDay } from "@/lib/capture/preview";
import { cn } from "@/lib/utils";
import { deleteTaskAction, toggleTaskAction } from "@/server/routine";
import type { TaskRow } from "./task-item";

/** Cartão de tarefa/lembrete para o quadro (raias): concluir, prazo, prioridade e excluir. */
export function TaskCard({ task, today }: { task: TaskRow; today: string }) {
  const overdue = task.due_date !== null && task.due_date < today;
  let when: string | null = null;
  if (task.due_date) {
    when = relativeDay(task.due_date, today);
    if (task.remind_at) when += ` às ${formatTimeBR(task.remind_at)}`;
  }

  return (
    <li className="group/card glass-panel grid gap-1.5 rounded-[12px] p-2.5 shadow-none">
      <div className="flex items-start gap-2.5">
        <form action={toggleTaskAction} className="pt-px">
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="done" value="true" />
          <button
            type="submit"
            aria-label={`Concluir “${task.title}”`}
            className="relative grid size-5 place-items-center rounded-full border-2 border-input bg-inner text-transparent pointer-coarse:size-6 pointer-coarse:after:absolute pointer-coarse:after:-inset-2.5 pointer-coarse:after:content-[''] transition-colors outline-none hover:border-(--series-habit) hover:text-(--series-habit) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <CheckIcon className="size-3" strokeWidth={3} aria-hidden />
          </button>
        </form>
        <p className="min-w-0 flex-1 text-[0.78125rem] leading-snug font-bold [overflow-wrap:anywhere]">{task.title}</p>
        <form action={deleteTaskAction}>
          <input type="hidden" name="id" value={task.id} />
          <Button
            type="submit"
            variant="ghost"
            size="icon-xs"
            aria-label={`Excluir “${task.title}”`}
            className="-mt-0.5 -mr-1 md:opacity-0 md:group-focus-within/card:opacity-100 md:group-hover/card:opacity-100"
          >
            <Trash2Icon />
          </Button>
        </form>
      </div>
      {(when || task.priority === "high") && (
        <div className="flex flex-wrap items-center justify-between gap-1.5 pl-7 text-[0.6875rem] sm:text-[0.625rem] font-semibold">
          {when ? (
            <span className={cn("flex items-center gap-1", overdue ? "text-risk" : "text-muted-foreground")}>
              <ClockIcon className="size-3" aria-hidden />
              {overdue ? `${task.kind === "reminder" ? "atrasado" : "atrasada"} · ${when}` : when}
            </span>
          ) : (
            <span />
          )}
          {task.priority === "high" && <Badge variant="gold">Alta</Badge>}
        </div>
      )}
    </li>
  );
}
