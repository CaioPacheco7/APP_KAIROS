import Link from "next/link";
import { connection } from "next/server";
import { HabitComposer } from "@/components/routine/habit-composer";
import { HabitRow } from "@/components/routine/habit-row";
import { NoteCard, type NoteRow } from "@/components/routine/note-card";
import { NoteDialog } from "@/components/routine/note-dialog";
import { TaskComposer } from "@/components/routine/task-composer";
import { TaskItem, type TaskRow } from "@/components/routine/task-item";
import { SparklesIcon } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { ProgressRing } from "@/components/app/progress-ring";
import { Hourglass } from "@/components/brand/hourglass";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="grid grid-cols-1 gap-8">
      <PageHeader
        eyebrow="Rotina"
        title="Seu dia, em ordem"
        description="Hábitos para marcar todo dia, tarefas, lembretes e o seu bloco de notas."
        actions={tab === "notas" ? <NoteDialog /> : undefined}
      />

      <nav
        aria-label="Seções da rotina"
        className="no-scrollbar animate-rise flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-full border border-border bg-card/70 p-1 shadow-xs backdrop-blur"
        style={{ "--d": "60ms" } as React.CSSProperties}
      >
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/rotina?aba=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                : "text-muted-foreground hover:text-foreground",
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
    <div className="grid grid-cols-1 gap-6">
      {/* Resumo do dia */}
      <Card className="animate-rise relative" style={{ "--d": "100ms" } as React.CSSProperties}>
        <Hourglass className="pointer-events-none absolute -right-4 -bottom-8 h-48 text-gold-fill opacity-[0.06]" />
        <CardContent className="relative flex flex-wrap items-center gap-6">
          <ProgressRing value={done} max={Math.max(total, 1)} size={104} stroke={9} label="Hábitos feitos hoje">
            <span className="font-display text-4xl leading-none tabular-nums">
              {done}
              <span className="text-xl text-muted-foreground">/{total}</span>
            </span>
          </ProgressRing>
          <div className="min-w-0">
            <p className="eyebrow mb-2.5">Hoje</p>
            <h2 className="font-display text-3xl leading-tight tracking-tight first-letter:uppercase sm:text-4xl">{longDate}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground tabular-nums">
              {total === 0
                ? "Nenhum hábito para hoje"
                : done === total
                  ? "Tudo feito por hoje. Bom trabalho!"
                  : `${total - done} ${total - done === 1 ? "hábito falta" : "hábitos faltam"} (${pct}% concluído)`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-rise" style={{ "--d": "160ms" } as React.CSSProperties}>
        <CardHeader>
          <CardTitle>Hábitos de hoje</CardTitle>
          <CardDescription>Toque no círculo para marcar como feito</CardDescription>
        </CardHeader>
        <CardContent>
          {scheduled.length === 0 ? (
            <EmptyState icon={SparklesIcon} tone="sage" title={board.length === 0 ? "Comece pelo primeiro hábito" : "Dia livre"} className="border-0 py-8">
              {board.length === 0
                ? "Adicione algo que você quer fazer todo dia, como “Tomar creatina” ou “Beber 2 litros de água”."
                : "Nenhum hábito previsto para hoje."}
            </EmptyState>
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
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground select-none hover:text-foreground">
            Fora da agenda de hoje ({others.length})
          </summary>
          <Card className="mt-3">
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
        <Card className="animate-rise">
          <CardHeader>
            <CardTitle>Tarefas e lembretes para hoje</CardTitle>
            <CardDescription>O que vence hoje ou já passou do prazo</CardDescription>
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
    <div className="grid grid-cols-1 gap-4">
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
        <CardContent className="grid grid-cols-1 gap-1 py-10 text-center">
          <p className="font-medium">Nenhuma nota ainda</p>
          <p className="text-sm text-muted-foreground">
            Crie uma pelo botão Nova nota, ou escreva “anotar: …” na aba Registrar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <li key={note.id}>
          <NoteCard note={note} />
        </li>
      ))}
    </ul>
  );
}
