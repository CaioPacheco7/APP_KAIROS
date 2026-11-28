import { BellRingIcon, PauseIcon, PlayIcon, Trash2Icon } from "lucide-react";
import { Panel } from "@/components/app/panel";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { repeatLabel } from "@/lib/reminders";
import { cn } from "@/lib/utils";
import { deleteTaskAction, toggleTaskAction } from "@/server/routine";

export type FixedReminderRow = {
  id: string;
  title: string;
  repeat_weekdays: number[];
  remind_time: string;
  status: "open" | "done";
};

/** Lembretes fixos (RN-40): repetem nos dias e no horário escolhidos. Pausar = não avisa. */
export function FixedReminders({ items }: { items: FixedReminderRow[] }) {
  if (items.length === 0) return null;
  return (
    <Panel title="Lembretes fixos" subtitle="Repetem sozinhos; o celular avisa no horário">
      <ul className="divide-y divide-line">
        {items.map((r) => {
          const paused = r.status === "done";
          return (
            <li key={r.id} className="flex items-center gap-3 py-3">
              <span
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-[12px]",
                  paused ? "glass-inner text-muted-foreground" : "bg-gold-soft text-gold",
                )}
              >
                <BellRingIcon className="size-[18px]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-[0.9375rem] font-bold max-sm:line-clamp-2 max-sm:whitespace-normal", paused && "text-muted-foreground")}>
                  {r.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {repeatLabel(r.repeat_weekdays, r.remind_time)}
                  {paused && " · pausado"}
                </p>
              </div>
              <form action={toggleTaskAction}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="done" value={String(!paused)} />
                <Button type="submit" variant="ghost" size="icon-sm" aria-label={paused ? `Retomar “${r.title}”` : `Pausar “${r.title}”`} title={paused ? "Retomar" : "Pausar"}>
                  {paused ? <PlayIcon /> : <PauseIcon />}
                </Button>
              </form>
              <form action={deleteTaskAction}>
                <input type="hidden" name="id" value={r.id} />
                <ConfirmButton
                  message={`Excluir o lembrete fixo “${r.title}”?`}
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Excluir “${r.title}”`}
                  className="text-muted-foreground"
                >
                  <Trash2Icon />
                </ConfirmButton>
              </form>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
