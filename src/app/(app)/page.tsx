import {
  ArrowRightIcon,
  CheckCheckIcon,
  CheckIcon,
  CoinsIcon,
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
import { HealthSummary } from "@/components/health/health-card";
import { HabitRow } from "@/components/routine/habit-row";
import { NoteCard, type NoteRow } from "@/components/routine/note-card";
import { NoteDialog } from "@/components/routine/note-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Count } from "@/components/viz/count";
import { formatLongDate, greetingForHour, hourInSaoPaulo } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { capitalize } from "@/lib/utils";
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
    <div className="grid grid-cols-1 gap-5">
      {/* Saudação */}
      <header className="animate-rise">
        <p className="eyebrow mb-3">{capitalize(formatLongDate(today))}</p>
        <h1 className="text-[clamp(2.15rem,4.8vw,4.1rem)] leading-[1.02] font-extrabold tracking-[-0.065em]">
          {greeting}
          {firstName ? (
            <>
              , <span className="text-gold">{firstName}</span>
            </>
          ) : null}
          .
        </h1>
        <p className="mt-2.5 max-w-xl text-[0.875rem] leading-relaxed text-muted-foreground">
          Escolha por onde começar. O que você registrar fica guardado aqui, tudo em um só lugar.
        </p>
      </header>

      {/* Atalhos */}
      <ul className="stagger grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {QUICK.map((q) => (
          <li key={q.href}>
            <Link
              href={q.href}
              className="group glass-panel flex items-center gap-3 rounded-[16px] p-3 transition-[transform,background-color] duration-300 outline-none hover:-translate-y-0.5 hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <IconChip icon={q.icon} tone={q.tone} className="size-10 rounded-[12px]" />
              <span className="min-w-0 flex-1">
                <span className="block text-[0.8125rem] font-extrabold">{q.label}</span>
                <span className="block truncate text-[0.6875rem] text-muted-foreground">{q.hint}</span>
              </span>
              <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      {/* Setores */}
      <section aria-label="Seus setores" className="stagger grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Finanças */}
        <SectorCard
          title="Finanças"
          icon={WalletIcon}
          tone="gold"
          href={finance ? "/dashboard" : undefined}
          className="lg:col-span-7"
        >
          {finance ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
                <div>
                  <p className="text-[0.6875rem] font-semibold text-muted-foreground">Saldo total</p>
                  <p className="text-[clamp(2.2rem,4vw,3.2rem)] leading-[1.02] font-extrabold tracking-[-0.07em]">
                    <Count value={finance.balance} />
                  </p>
                </div>
                {finance.health.perDay !== null && (
                  <p className="flex items-center gap-2 rounded-[12px] border border-[#f6e3b4] bg-[linear-gradient(145deg,#e9cd8f,#c39a50)] px-3 py-2 text-[#22180a]">
                    <CoinsIcon className="size-4 shrink-0" aria-hidden />
                    <span>
                      <span className="block text-[0.625rem] font-bold">Pode gastar por dia</span>
                      <strong className="block text-base leading-tight font-extrabold tracking-[-0.03em]">
                        {formatBRL(Math.max(finance.health.perDay, 0))}
                      </strong>
                    </span>
                  </p>
                )}
              </div>
              <div className="glass-inner rounded-[14px] p-3.5">
                <HealthSummary health={finance.health} compact />
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/dashboard" className={buttonVariants()}>
                  Abrir finanças <ArrowRightIcon />
                </Link>
                <Link href="/registrar" className={buttonVariants({ variant: "outline" })}>
                  Registrar um gasto
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-[0.875rem] leading-relaxed text-muted-foreground">
                Um painel para entender o seu dinheiro e decidir com calma. Antes, preciso te conhecer
                um pouco: são poucas perguntas.
              </p>
              <ul className="grid gap-2.5">
                {FINANCE_BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-[0.8125rem] font-semibold">
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
        <SectorCard title="Rotina" icon={ListChecksIcon} tone="sage" href="/rotina" className="lg:col-span-5">
          {board.length === 0 ? (
            <>
              <p className="text-[0.875rem] leading-relaxed text-muted-foreground">
                Monte a sua rotina: hábitos para marcar todo dia, como “tomar creatina” ou “beber 2
                litros de água”, além de tarefas e lembretes.
              </p>
              <Link href="/rotina" className={`${buttonVariants({ variant: "gold", size: "lg" })} w-fit`}>
                Montar minha rotina <ArrowRightIcon />
              </Link>
            </>
          ) : (
            <>
              <div className="glass-inner flex items-center gap-4 rounded-[14px] p-3">
                <ProgressRing value={done} max={Math.max(total, 1)} size={72} stroke={7} label="Hábitos feitos hoje">
                  <span className="text-xl leading-none font-extrabold tracking-[-0.04em]">
                    {done}
                    <span className="text-sm text-muted-foreground">/{total}</span>
                  </span>
                </ProgressRing>
                <div className="min-w-0">
                  <p className="text-[0.875rem] font-extrabold">
                    {total === 0
                      ? "Nenhum hábito para hoje"
                      : done === total
                        ? "Tudo feito por hoje"
                        : `${total - done} ${total - done === 1 ? "hábito falta" : "hábitos faltam"} hoje`}
                  </p>
                  <p className="text-[0.75rem] text-muted-foreground">
                    {pendingTasks > 0
                      ? `${pendingTasks} ${pendingTasks === 1 ? "tarefa" : "tarefas"} para hoje ou atrasadas`
                      : "Nenhuma tarefa pendente"}
                  </p>
                </div>
              </div>

              {todayHabits.length > 0 && (
                <ul className="-my-1 divide-y divide-line">
                  {todayHabits.slice(0, 4).map((h) => (
                    <HabitRow key={h.id} habit={h} today={today} manage={false} />
                  ))}
                </ul>
              )}
              {todayHabits.length > 4 && (
                <Link href="/rotina" className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:underline">
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
          tone="rose"
          href={notes.length > 0 ? "/rotina?aba=notas" : undefined}
          hrefLabel="Ver todas"
          className="lg:col-span-12"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.875rem] text-muted-foreground">
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
