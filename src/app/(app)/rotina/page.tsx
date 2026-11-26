import {
  CalendarClockIcon,
  CalendarIcon,
  CircleAlertIcon,
  FlameIcon,
  InboxIcon,
  ListTodoIcon,
  SparklesIcon,
  SunIcon,
  TargetIcon,
  type LucideIcon,
} from "lucide-react";
import { connection } from "next/server";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/app/panel";
import { ProgressRing } from "@/components/app/progress-ring";
import { HabitComposer } from "@/components/routine/habit-composer";
import { HabitRow } from "@/components/routine/habit-row";
import { NoteCard, type NoteRow } from "@/components/routine/note-card";
import { NoteDialog } from "@/components/routine/note-dialog";
import { TaskCard } from "@/components/routine/task-card";
import { TaskComposer } from "@/components/routine/task-composer";
import { TaskItem, type TaskRow } from "@/components/routine/task-item";
import { HabitWeek } from "@/components/viz/habit-week";
import { Metric } from "@/components/viz/metric";
import { formatLongDate } from "@/lib/dates";
import { routineTab, type RoutineTab } from "@/lib/navigation";
import { LANES, completionRate, laneFor, weekTotals, type Lane } from "@/lib/routine";
import { createClient } from "@/lib/supabase/server";
import { capitalize, cn } from "@/lib/utils";
import { getHabitBoard, summarizeToday } from "@/server/habits-board";
import { getFormOptions } from "@/server/queries";

export const metadata = { title: "Rotina · KAIROS" };

const HEADERS: Record<RoutineTab, { title: string; description: string }> = {
  hoje: {
    title: "Seu dia, em ordem",
    description: "Hábitos para marcar todo dia, a sua semana e o que vence hoje.",
  },
  tarefas: { title: "Tarefas", description: "Um quadro por prazo: o que atrasou, o que é para hoje e o que vem depois." },
  lembretes: { title: "Lembretes", description: "Avisos com data e hora, organizados pelo prazo." },
  notas: { title: "Notas", description: "Seu bloco de notas: ideias, listas e lembranças." },
};

export default async function RotinaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // A hora atual só pode ser lida em tempo de requisição (não na pré-renderização).
  await connection();
  const sp = await searchParams;
  const tab = routineTab(sp.aba);
  const { today } = await getFormOptions();

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader
        eyebrow="Rotina"
        title={HEADERS[tab].title}
        description={HEADERS[tab].description}
        actions={tab === "notas" ? <NoteDialog /> : undefined}
      />

      {tab === "hoje" && <Today today={today} />}
      {tab === "notas" && <Notes />}
      {(tab === "tarefas" || tab === "lembretes") && (
        <Board kind={tab === "lembretes" ? "reminder" : "task"} today={today} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Hoje: resumo, semana de hábitos, checklist e o que vence hoje
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
  const week = weekTotals(board);
  const rate = completionRate(week);
  const best = board.reduce((max, h) => Math.max(max, h.streak), 0);
  const bestHabit = board.find((h) => h.streak === best && best > 0);

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr]">
        {/* Resumo do dia */}
        <Panel title="Hoje" headerClassName="sr-only" className="md:col-span-2 xl:col-span-1">
          <div className="flex flex-wrap items-center gap-5">
            <ProgressRing value={done} max={Math.max(total, 1)} size={104} stroke={9} label="Hábitos feitos hoje">
              <span className="text-3xl leading-none font-extrabold tracking-[-0.05em]">
                {done}
                <span className="text-lg text-muted-foreground">/{total}</span>
              </span>
            </ProgressRing>
            <div className="min-w-0">
              <p className="eyebrow mb-2">Hoje</p>
              <h2 className="text-2xl leading-tight font-extrabold tracking-[-0.045em] sm:text-3xl">
                {capitalize(formatLongDate(today))}
              </h2>
              <p className="mt-1 text-[0.8125rem] text-muted-foreground">
                {total === 0
                  ? "Nenhum hábito para hoje"
                  : done === total
                    ? "Tudo feito por hoje. Bom trabalho!"
                    : `${total - done} ${total - done === 1 ? "hábito falta" : "hábitos faltam"} (${Math.round((done / total) * 100)}% concluído)`}
              </p>
            </div>
          </div>
        </Panel>

        {/* Indicadores */}
        <div className="glass-inner grid min-w-0 grid-cols-2 gap-[7px] rounded-[20px] p-1.5 xl:col-span-1">
          <Metric
            label="Feitos em 7 dias"
            icon={TargetIcon}
            value={Math.round(rate ?? 0)}
            format="percent"
            highlight
            footer={rate === null ? "nada previsto" : "dos hábitos previstos"}
          />
          <Metric
            label="Maior sequência"
            icon={FlameIcon}
            value={best}
            format="int"
            footer={bestHabit ? `${best === 1 ? "dia" : "dias"} · ${bestHabit.name}` : "comece hoje"}
          />
          <Metric
            label="Para hoje"
            icon={ListTodoIcon}
            value={tasks.filter((t) => t.due_date === today).length}
            format="int"
            footer="tarefas e lembretes"
          />
          <Metric
            label="Atrasadas"
            icon={CircleAlertIcon}
            value={tasks.filter((t) => t.due_date !== null && t.due_date < today).length}
            format="int"
            footer="passaram do prazo"
          />
        </div>

        {/* Semana */}
        <Panel title="Últimos 7 dias" subtitle="Hábitos feitos por dia (dourado) e previstos (trilho)" className="md:col-span-2 xl:col-span-1">
          {board.length === 0 ? (
            <p className="py-8 text-center text-[0.8125rem] text-muted-foreground">Crie um hábito para ver a sua semana.</p>
          ) : (
            <HabitWeek totals={week} today={today} />
          )}
        </Panel>
      </div>

      <div className="stagger grid grid-cols-1 gap-3 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Hábitos de hoje" subtitle="Toque no círculo para marcar como feito">
          {scheduled.length === 0 ? (
            <EmptyState icon={SparklesIcon} tone="sage" title={board.length === 0 ? "Comece pelo primeiro hábito" : "Dia livre"} className="py-8">
              {board.length === 0
                ? "Adicione algo que você quer fazer todo dia, como “Tomar creatina” ou “Beber 2 litros de água”."
                : "Nenhum hábito previsto para hoje."}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {scheduled.map((h) => (
                <HabitRow key={h.id} habit={h} today={today} />
              ))}
            </ul>
          )}
          {others.length > 0 && (
            <details className="group mt-3">
              <summary className="cursor-pointer text-[0.75rem] font-semibold text-muted-foreground select-none hover:text-foreground">
                Fora da agenda de hoje ({others.length})
              </summary>
              <ul className="mt-2 divide-y divide-line">
                {others.map((h) => (
                  <HabitRow key={h.id} habit={h} today={today} />
                ))}
              </ul>
            </details>
          )}
          <div className="mt-4 border-t border-line pt-4">
            <HabitComposer />
          </div>
        </Panel>

        <Panel title="Vence hoje" subtitle="Tarefas e lembretes de hoje ou que já passaram">
          {tasks.length === 0 ? (
            <p className="flex items-center gap-2 py-2 text-[0.8125rem] text-muted-foreground">
              <SunIcon className="size-4 text-good" aria-hidden /> Nada pendente. Aproveite o dia.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {tasks.map((t) => (
                <TaskItem key={t.id} task={t} today={today} />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Tarefas e lembretes: quadro com raias por prazo
// ---------------------------------------------------------------------

const LANE_STYLE: Record<Lane, { icon: LucideIcon; className: string }> = {
  overdue: { icon: CircleAlertIcon, className: "bg-[color-mix(in_oklab,var(--status-critical)_13%,transparent)] text-risk" },
  today: { icon: SunIcon, className: "bg-[color-mix(in_oklab,var(--status-warning)_14%,transparent)] text-warn" },
  upcoming: { icon: CalendarClockIcon, className: "bg-[color-mix(in_oklab,var(--status-good)_13%,transparent)] text-good" },
  nodate: { icon: InboxIcon, className: "glass-inner text-muted-foreground" },
};

async function Board({ kind, today }: { kind: "task" | "reminder"; today: string }) {
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
  const lanes = LANES.filter((l) => kind === "task" || l.id !== "nodate");

  return (
    <div className="grid grid-cols-1 gap-3">
      <Panel
        title={kind === "reminder" ? "Novo lembrete" : "Nova tarefa"}
        subtitle={kind === "reminder" ? "Com data e, se quiser, horário" : "Com prazo, se tiver"}
      >
        <TaskComposer kind={kind} today={today} />
      </Panel>

      {open.length === 0 ? (
        <EmptyState icon={CalendarIcon} tone="sage" title={kind === "reminder" ? "Nenhum lembrete pendente" : "Nenhuma tarefa pendente"}>
          Tudo em dia. Crie a próxima logo acima ou escreva “tarefa: …” na busca do topo.
        </EmptyState>
      ) : (
        <Panel title="Quadro" subtitle={`${open.length} ${open.length === 1 ? "pendente" : "pendentes"}`}>
          <div className={cn("stagger grid grid-cols-1 gap-2.5 sm:grid-cols-2", lanes.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
            {lanes.map((lane) => {
              const items = open.filter((t) => laneFor(t.due_date, today) === lane.id);
              const style = LANE_STYLE[lane.id];
              return (
                <section key={lane.id} aria-label={lane.label} className="glass-inner min-w-0 rounded-[14px] p-[7px]">
                  <header className="flex items-center gap-1.5 px-1 pt-0.5 pb-2">
                    <span className={cn("grid size-[23px] place-items-center rounded-[7px]", style.className)}>
                      <style.icon className="size-3.5" aria-hidden />
                    </span>
                    <h3 className="min-w-0 truncate text-[0.75rem] font-extrabold">{lane.label}</h3>
                    <span className="ml-auto text-[0.6875rem] font-bold text-muted-foreground tabular-nums">{items.length}</span>
                  </header>
                  {items.length === 0 ? (
                    <p className="px-1 pb-2 text-[0.75rem] text-muted-foreground">Nada aqui.</p>
                  ) : (
                    <ul className="grid gap-1.5">
                      {items.map((t) => (
                        <TaskCard key={t.id} task={t} today={today} />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </Panel>
      )}

      {done.length > 0 && (
        <details className="glass-inner rounded-[16px] px-4 py-3">
          <summary className="cursor-pointer text-[0.75rem] font-semibold text-muted-foreground select-none hover:text-foreground">
            Concluídas recentemente ({done.length})
          </summary>
          <ul className="mt-2 divide-y divide-line">
            {done.map((t) => (
              <TaskItem key={t.id} task={t} today={today} />
            ))}
          </ul>
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
      <EmptyState icon={SparklesIcon} tone="rose" title="Nenhuma nota ainda">
        Crie uma pelo botão Nova nota, ou escreva “anotar: …” na busca do topo ou no Registrar.
      </EmptyState>
    );
  }

  return (
    <ul className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <li key={note.id}>
          <NoteCard note={note} />
        </li>
      ))}
    </ul>
  );
}
