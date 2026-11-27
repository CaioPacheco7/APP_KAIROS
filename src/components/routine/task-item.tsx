import { CheckIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDayMonth, formatTimeBR } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { deleteTaskAction, toggleTaskAction } from "@/server/routine";

export type TaskRow = {
  id: string;
  kind: "task" | "reminder";
  title: string;
  due_date: string | null;
  remind_at: string | null;
  priority: "low" | "normal" | "high";
  status: "open" | "done";
};

/** Uma tarefa ou lembrete: marcar como feito, prazo e excluir. */
export function TaskItem({ task, today }: { task: TaskRow; today: string }) {
  const isDone = task.status === "done";
  const overdue = !isDone && task.due_date !== null && task.due_date < today;

  let when = "";
  if (task.due_date) {
    when = task.due_date === today ? "hoje" : formatDayMonth(task.due_date);
    if (task.remind_at) when += ` às ${formatTimeBR(task.remind_at)}`;
  }

  return (
    <li className="group/task flex items-center gap-3.5 py-3">
      <form action={toggleTaskAction}>
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="done" value={String(!isDone)} />
        <button
          type="submit"
          aria-label={isDone ? "Reabrir" : "Concluir"}
          className={cn(
            "grid size-6 place-items-center rounded-full border-2 border-input bg-inner transition-colors hover:border-(--series-habit) hover:bg-gold-soft",
            isDone && "border-(--series-habit) bg-(--series-habit) text-[#fffaf0] hover:bg-(--series-habit) dark:text-[#22180a]",
          )}
        >
          {isDone && <CheckIcon className="size-3.5" strokeWidth={3} />}
        </button>
      </form>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[0.9375rem]", isDone && "text-muted-foreground line-through")}>
          {task.title}
        </p>
        {when && (
          <p className={cn("text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
            {overdue ? `Atrasada · ${when}` : when}
          </p>
        )}
      </div>

      {task.priority === "high" && !isDone && <Badge variant="gold">Alta</Badge>}

      <form action={deleteTaskAction}>
        <input type="hidden" name="id" value={task.id} />
        <Button type="submit" variant="ghost" size="icon-sm" aria-label="Excluir" className="text-muted-foreground md:opacity-0 md:group-hover/task:opacity-100 md:focus-visible:opacity-100">
          <Trash2Icon />
        </Button>
      </form>
    </li>
  );
}
