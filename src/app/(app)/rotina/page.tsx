import { connection } from "next/server";
import { CheckIcon, PinIcon, PinOffIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { NoteDialog } from "@/components/routine/note-dialog";
import { TaskComposer } from "@/components/routine/task-composer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDayMonth, formatTimeBR } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { getFormOptions } from "@/server/queries";
import {
  deleteNoteAction,
  deleteTaskAction,
  toggleNotePinAction,
  toggleTaskAction,
} from "@/server/routine";

export const metadata = { title: "Rotina · KAIROS" };

const TABS = [
  { id: "tarefas", label: "Tarefas" },
  { id: "lembretes", label: "Lembretes" },
  { id: "notas", label: "Notas" },
] as const;
type Tab = (typeof TABS)[number]["id"];

type TaskRow = {
  id: string;
  kind: "task" | "reminder";
  title: string;
  due_date: string | null;
  remind_at: string | null;
  priority: "low" | "normal" | "high";
  status: "open" | "done";
};

type NoteRow = { id: string; title: string; body: string; pinned: boolean };

export default async function RotinaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // A hora atual só pode ser lida em tempo de requisição (não na pré-renderização).
  await connection();
  const sp = await searchParams;
  const raw = Array.isArray(sp.aba) ? sp.aba[0] : sp.aba;
  const tab: Tab = TABS.find((t) => t.id === raw)?.id ?? "tarefas";
  const { today } = await getFormOptions();

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rotina</h1>
          <p className="text-sm text-muted-foreground">
            Tarefas, lembretes e anotações. Você também pode criá-los pela aba
            Registrar.
          </p>
        </div>
        {tab === "notas" && <NoteDialog />}
      </header>

      <nav
        aria-label="Seções da rotina"
        className="flex w-fit gap-1 rounded-full border border-border bg-card/60 p-1"
      >
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/rotina?aba=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm transition-colors",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "notas" ? (
        <Notes />
      ) : (
        <Tasks kind={tab === "lembretes" ? "reminder" : "task"} today={today} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Tarefas e lembretes
// ---------------------------------------------------------------------

async function Tasks({ kind, today }: { kind: "task" | "reminder"; today: string }) {
  const db = await createClient();
  const base = () =>
    db
      .from("tasks")
      .select("id, kind, title, due_date, remind_at, priority, status")
      .is("deleted_at", null)
      .eq("kind", kind);

  const [openRes, doneRes] = await Promise.all([
    base()
      .eq("status", "open")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .limit(200),
    base()
      .eq("status", "done")
      .order("completed_at", { ascending: false })
      .limit(15),
  ]);
  const open = (openRes.data ?? []) as TaskRow[];
  const done = (doneRes.data ?? []) as TaskRow[];

  return (
    <div className="grid gap-4">
      <TaskComposer kind={kind} today={today} />

      <Card>
        <CardContent>
          {open.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {kind === "reminder" ? "Nenhum lembrete pendente." : "Nenhuma tarefa pendente. 🎉"}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {open.map((t) => (
                <TaskItem key={t.id} task={t} today={today} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {done.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground select-none">
            Concluídas recentemente ({done.length})
          </summary>
          <Card className="mt-2">
            <CardContent>
              <ul className="divide-y divide-border">
                {done.map((t) => (
                  <TaskItem key={t.id} task={t} today={today} />
                ))}
              </ul>
            </CardContent>
          </Card>
        </details>
      )}
    </div>
  );
}

function TaskItem({ task, today }: { task: TaskRow; today: string }) {
  const isDone = task.status === "done";
  const overdue = !isDone && task.due_date !== null && task.due_date < today;

  let when = "";
  if (task.due_date) {
    when = task.due_date === today ? "hoje" : formatDayMonth(task.due_date);
    if (task.remind_at) when += ` às ${formatTimeBR(task.remind_at)}`;
  }

  return (
    <li className="flex items-center gap-3 py-2.5">
      <form action={toggleTaskAction}>
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="done" value={String(!isDone)} />
        <button
          type="submit"
          aria-label={isDone ? "Reabrir" : "Concluir"}
          className={cn(
            "flex size-5 items-center justify-center rounded-md border border-input transition-colors hover:border-ring",
            isDone && "border-primary bg-primary text-primary-foreground",
          )}
        >
          {isDone && <CheckIcon className="size-3.5" />}
        </button>
      </form>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", isDone && "text-muted-foreground line-through")}>
          {task.title}
        </p>
        {when && (
          <p className={cn("text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
            {overdue ? `Atrasada · ${when}` : when}
          </p>
        )}
      </div>

      {task.priority === "high" && !isDone && <Badge variant="outline">Alta</Badge>}

      <form action={deleteTaskAction}>
        <input type="hidden" name="id" value={task.id} />
        <Button type="submit" variant="ghost" size="icon-sm" aria-label="Excluir">
          <Trash2Icon />
        </Button>
      </form>
    </li>
  );
}

// ---------------------------------------------------------------------
// Notas
// ---------------------------------------------------------------------

async function Notes() {
  const db = await createClient();
  const { data } = await db
    .from("notes")
    .select("id, title, body, pinned")
    .is("deleted_at", null)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(200);
  const notes = (data ?? []) as NoteRow[];

  if (notes.length === 0) {
    return (
      <Card>
        <CardContent className="grid gap-1 py-10 text-center">
          <p className="font-medium">Nenhuma nota ainda</p>
          <p className="text-sm text-muted-foreground">
            Crie uma pelo botão Nova nota, ou escreva “anotar: …” na aba Registrar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <li key={note.id}>
          <Card className="h-full">
            <CardContent className="flex h-full flex-col gap-2">
              {note.title && <p className="font-medium">{note.title}</p>}
              <p className="line-clamp-6 text-sm whitespace-pre-wrap text-muted-foreground">
                {note.body}
              </p>
              <div className="mt-auto flex items-center justify-end">
                <form action={toggleNotePinAction}>
                  <input type="hidden" name="id" value={note.id} />
                  <input type="hidden" name="pinned" value={String(!note.pinned)} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={note.pinned ? "Desafixar" : "Fixar no topo"}
                  >
                    {note.pinned ? <PinOffIcon /> : <PinIcon />}
                  </Button>
                </form>
                <NoteDialog note={note} />
                <form action={deleteNoteAction}>
                  <input type="hidden" name="id" value={note.id} />
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label="Excluir nota">
                    <Trash2Icon />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
