import {
  ArrowRightIcon,
  CheckCheckIcon,
  CheckIcon,
  ListChecksIcon,
  NotebookPenIcon,
  SquarePenIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { IconChip, type Tone } from "@/components/app/icon-chip";
import { ProgressRing } from "@/components/app/progress-ring";
import { SectorCard } from "@/components/app/sector-card";
import { Hourglass } from "@/components/brand/hourglass";
import { HealthSummary } from "@/components/health/health-card";
import { HabitRow } from "@/components/routine/habit-row";
import { NoteCard, type NoteRow } from "@/components/routine/note-card";
import { NoteDialog } from "@/components/routine/note-dialog";
import { buttonVariants } from "@/components/ui/button";
import { formatLongDate, greetingForHour, hourInSaoPaulo } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { getHabitBoard, summarizeToday } from "@/server/habits-board";
import { getMonthSnapshot } from "@/server/health";
import { getAccounts, getBalances, getFormOptions, getProfile } from "@/server/queries";

export const metadata = { title: "Início · KAIROS" };

const QUICK: Array<{ href: string; label: string; hint: string; icon: typeof SquarePenIcon; tone: Tone }> = [
  { href: "/registrar", label: "Registrar um gasto", hint: "Escreva do seu jeito", icon: SquarePenIcon, tone: "gold" },
  { href: "/rotina", label: "Marcar meus hábitos", hint: "O que você já fez hoje", icon: CheckCheckIcon, tone: "sage" },
  { href: "/rotina?aba=notas", label: "Anotar uma ideia", hint: "Seu bloco de notas", icon: NotebookPenIcon, tone: "rose" },
];

const FINANCE_BENEFITS = [
  "Saiba para onde vai o seu dinheiro",
  "Contas fixas e vencimentos sob controle",
  "Planos: juntar para uma moto ou sair de uma dívida",
];

export default async function InicioPage() {
  // A hora atual só pode ser lida em tempo de requisição (não na pré-renderização).
  await connection();
  const { today } = await getFormOptions();
  const profile = await getProfile();
  const financeReady = Boolean(profile?.onboarded_at);
  const firstName = profile?.name?.trim().split(/\s+/)[0];
  const greeting = greetingForHour(hourInSaoPaulo());

  const db = await createClient();
  const [board, notesRes, tasksDue] = await Promise.all([
    getHabitBoard(today),
    db
      .from("notes")
      .select("id, title, body, pinned")
      .is("deleted_at", null)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(3),
    db
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "open")
      .not("due_date", "is", null)
      .lte("due_date", today),
  ]);

  const notes = (notesRes.data ?? []) as NoteRow[];
  const { total, done } = summarizeToday(board);
  const todayHabits = board.filter((h) => h.scheduledToday);
  const pendingTasks = tasksDue.count ?? 0;

  // Resumo das finanças só existe para quem já configurou o módulo.
  let finance: { health: Awaited<ReturnType<typeof getMonthSnapshot>>["health"]; balance: number } | null = null;
  if (financeReady) {
    const [snapshot, accounts, balances] = await Promise.all([
      getMonthSnapshot(today.slice(0, 7), today),
      getAccounts(),
      getBalances(),
    ]);
    finance = {
      health: snapshot.health,
      balance: accounts.reduce((sum, a) => sum + (balances.get(a.id) ?? 0), 0),
    };
  }

  return (
    <div className="grid grid-cols-1 gap-12">
      {/* Saudação */}
      <section className="animate-rise relative grid gap-8">
        <Hourglass className="pointer-events-none absolute -top-6 right-2 hidden h-64 text-gold-fill opacity-[0.07] lg:block" />
        <div className="relative">
          <p className="eyebrow mb-4">{formatLongDate(today)}</p>
          <h1 className="font-display text-5xl leading-[1.02] tracking-tight sm:text-7xl">
            {greeting}
            {firstName ? (
              <>
                , <em className="text-gold">{firstName}</em>
              </>
            ) : null}
            .
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Escolha por onde começar. O que você registrar fica guardado aqui,
            tudo em um só lugar.
          </p>
        </div>

        <ul className="relative grid grid-cols-1 gap-3 sm:grid-cols-3">
          {QUICK.map((q, i) => (
            <li key={q.href} className="animate-rise" style={{ "--d": `${120 + i * 70}ms` } as React.CSSProperties}>
              <Link
                href={q.href}
                className="group flex items-center gap-3.5 rounded-2xl border border-border bg-card p-3.5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-fill/40"
              >
                <IconChip icon={q.icon} tone={q.tone} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{q.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{q.hint}</span>
                </span>
                <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Setores */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Finanças */}
        <SectorCard
          title="Finanças"
          icon={WalletIcon}
          photo="/photos/financas-broto.jpg"
          href={finance ? "/dashboard" : undefined}
          hrefLabel="Abrir"
          priority
          className="animate-rise lg:col-span-7"
          sizes="(min-width: 1024px) 680px, 100vw"
        >
          {finance ? (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Saldo total</p>
                <p className="font-display text-6xl leading-none tracking-normal tabular-nums">
                  {formatBRL(finance.balance)}
                </p>
              </div>
              <HealthSummary health={finance.health} />
              <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
                Abrir finanças <ArrowRightIcon />
              </Link>
            </>
          ) : (
            <>
              <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">
                Um painel para entender o seu dinheiro e decidir com calma. Antes,
                preciso te conhecer um pouco: são poucas perguntas.
              </p>
              <ul className="grid gap-2.5">
                {FINANCE_BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold-soft text-gold">
                      <CheckIcon className="size-3" aria-hidden />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link href="/financas" className={buttonVariants({ variant: "gold", size: "lg" })}>
                  Começar a controlar meus gastos <ArrowRightIcon />
                </Link>
                <span className="text-xs text-muted-foreground">
                  Cerca de 2 minutos. Só quer a rotina? Pode ignorar este bloco.
                </span>
              </div>
            </>
          )}
        </SectorCard>

        {/* Rotina */}
        <SectorCard
          title="Rotina"
          icon={ListChecksIcon}
          photo="/photos/rotina-yoga.jpg"
          href="/rotina"
          hrefLabel="Abrir"
          className="animate-rise lg:col-span-5"
          sizes="(min-width: 1024px) 480px, 100vw"
        >
          {board.length === 0 ? (
            <>
              <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">
                Monte a sua rotina: hábitos para marcar todo dia, como “tomar
                creatina” ou “beber 2 litros de água”, além de tarefas e lembretes.
              </p>
              <Link href="/rotina" className={`${buttonVariants({ variant: "gold", size: "lg" })} w-fit`}>
                Montar minha rotina <ArrowRightIcon />
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <ProgressRing value={done} max={Math.max(total, 1)} size={80} label="Hábitos feitos hoje">
                  <span className="font-display text-2xl tabular-nums">
                    {done}
                    <span className="text-base text-muted-foreground">/{total}</span>
                  </span>
                </ProgressRing>
                <div className="min-w-0">
                  <p className="font-medium">
                    {total === 0
                      ? "Nenhum hábito para hoje"
                      : done === total
                        ? "Tudo feito por hoje"
                        : `${total - done} ${total - done === 1 ? "hábito falta" : "hábitos faltam"} hoje`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {pendingTasks > 0
                      ? `${pendingTasks} ${pendingTasks === 1 ? "tarefa" : "tarefas"} para hoje ou atrasadas`
                      : "Nenhuma tarefa pendente"}
                  </p>
                </div>
              </div>

              {todayHabits.length > 0 && (
                <ul className="-my-1 divide-y divide-border">
                  {todayHabits.slice(0, 4).map((h) => (
                    <HabitRow key={h.id} habit={h} today={today} manage={false} />
                  ))}
                </ul>
              )}
              {todayHabits.length > 4 && (
                <Link href="/rotina" className="text-xs text-muted-foreground underline">
                  Ver todos os {todayHabits.length} hábitos de hoje
                </Link>
              )}
            </>
          )}
        </SectorCard>

        {/* Bloco de notas */}
        <SectorCard
          title="Bloco de notas"
          icon={NotebookPenIcon}
          photo="/photos/notas-caderno.jpg"
          href={notes.length > 0 ? "/rotina?aba=notas" : undefined}
          hrefLabel="Ver todas"
          layout="side"
          className="animate-rise lg:col-span-12"
          sizes="(min-width: 1024px) 480px, 100vw"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.9375rem] text-muted-foreground">
              {notes.length === 0
                ? "Anote ideias, listas e lembranças. Tudo fica guardado aqui."
                : "Suas anotações mais recentes."}
            </p>
            <NoteDialog />
          </div>
          {notes.length > 0 && (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {notes.map((note) => (
                <li key={note.id}>
                  <NoteCard note={note} lines={4} />
                </li>
              ))}
            </ul>
          )}
        </SectorCard>
      </section>
    </div>
  );
}
