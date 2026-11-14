import Link from "next/link";
import { connection } from "next/server";
import { HabitComposer } from "@/components/routine/habit-composer";
import { HabitRow } from "@/components/routine/habit-row";
import { NoteCard, type NoteRow } from "@/components/routine/note-card";
import { NoteDialog } from "@/components/routine/note-dialog";
import { TaskComposer } from "@/components/routine/task-composer";
import { TaskItem, type TaskRow } from "@/components/routine/task-item";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLongDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { getHabitBoard, summarizeToday } from "@/server/habits-board";
import { getFormOptions } from "@/server/queries";

export const metadata = { title: "Rotina · KAIROS" };

const TABS = [
  { id: "hoje", label: "Hoje" },
  { id: "tarefas", label: "Tarefas" },
  { id: "lembretes", label: "Lembretes" },
  { id: "notas", label: "Notas" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default async function RotinaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // A hora atual só pode ser lida em tempo de requisição (não na pré-renderização).
  await connection();
  const sp = await searchParams;
  const raw = Array.isArray(sp.aba) ? sp.aba[0] : sp.aba;
  const tab: Tab = TABS.find((t) => t.id === raw)?.id ?? "hoje";
  const { today } = await getFormOptions();

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rotina</h1>
          <p className="text-sm text-muted-foreground">
            Hábitos do dia, tarefas, lembretes e anotações.
          </p>
        </div>
        {tab === "notas" && <NoteDialog />}
      </header>

      <nav
        aria-label="Seções da rotina"
        className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-card/60 p-1"
      >
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/rotina?aba=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "hoje" && <Today today={today} />}
      {tab === "notas" && <Notes />}
      {(tab === "tarefas" || tab === "lembretes") && (
        <Tasks kind={tab === "lembretes" ? "reminder" : "task"} today={today} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Hoje: hábitos do dia + tarefas e lembretes que vencem hoje (ou atrasaram)
// ---------------------------------------------------------------------

async function Today({ today }: { today: string }) {
  const db = await createClient();
  const [board, tasksRes] = await Promise.all([
    getHabitBoard(today),
    db
      .from("tasks")
      .select("id, kind, title, due_date, remind_at, priority, status")
      .is("deleted_at", null)
      .eq("status", "open")
      .not("due_date", "is", null)
      .lte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(30),
  ]);
  const tasks = (tasksRes.data ?? []) as TaskRow[];

  const scheduled = board.filter((h) => h.scheduledToday);
  const others = board.filter((h) => !h.scheduledToday);
  const { total, done } = summarizeToday(board);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const longDate = formatLongDate(today);

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="grid gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-medium first-letter:uppercase">{longDate}</h2>
            <span className="text-sm text-muted-foreground tabular-nums">
              {total === 0
                ? "Nenhum hábito para hoje"
                : done === total
                  ? `Tudo feito por hoje (${done} de ${total})`
                  : `${done} de ${total} hábitos feitos`}
            </span>
          </div>
          {total > 0 && (
            <div
              className="h-2 rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Hábitos feitos hoje"
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(pct, done > 0 ? 3 : 0)}%` }} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hábitos de hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduled.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {board.length === 0
                ? "Você ainda não tem hábitos. Adicione o primeiro abaixo, como “Tomar creatina”."
                : "Nenhum hábito previsto para hoje."}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {scheduled.map((h) => (
                <HabitRow key={h.id} habit={h} today={today} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {others.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-muted-foreground select-none">
            Fora da agenda de hoje ({others.length})
          </summary>
          <Card className="mt-2">
            <CardContent>
              <ul className="divide-y divide-border">
                {others.map((h) => (
                  <HabitRow key={h.id} habit={h} today={today} />
                ))}
              </ul>
            </CardContent>
          </Card>
        </details>
      )}

      <HabitComposer />

      {tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tarefas e lembretes para hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {tasks.map((t) => (
                <TaskItem key={t.id} task={t} today={today} />
              ))}
            </ul>
          </CardContent>
        </Card>
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
          <NoteCard note={note} />
        </li>
      ))}
    </ul>
  );
}
