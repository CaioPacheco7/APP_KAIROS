import { ArrowRightIcon, NotebookPenIcon, WalletIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { HealthSummary } from "@/components/health/health-card";
import { HabitRow } from "@/components/routine/habit-row";
import { NoteCard, type NoteRow } from "@/components/routine/note-card";
import { NoteDialog } from "@/components/routine/note-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLongDate } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { getHabitBoard, summarizeToday } from "@/server/habits-board";
import { getMonthSnapshot } from "@/server/health";
import { getAccounts, getBalances, getFormOptions, getProfile } from "@/server/queries";

export const metadata = { title: "Início · KAIROS" };

export default async function InicioPage() {
  // A hora atual só pode ser lida em tempo de requisição (não na pré-renderização).
  await connection();
  const { today } = await getFormOptions();
  const profile = await getProfile();
  const financeReady = Boolean(profile?.onboarded_at);
  const firstName = profile?.name?.trim().split(/\s+/)[0];

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
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold">{firstName ? `Olá, ${firstName}` : "Olá"}</h1>
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {formatLongDate(today)}. Escolha por onde começar.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Finanças */}
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <WalletIcon className="size-5 text-muted-foreground" aria-hidden />
            <CardTitle>Finanças</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {finance ? (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo total</p>
                  <p className="text-3xl font-semibold tabular-nums">{formatBRL(finance.balance)}</p>
                </div>
                <HealthSummary health={finance.health} />
                <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
                  Abrir finanças <ArrowRightIcon />
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Controle seus gastos, contas fixas e planos (como juntar para uma moto ou sair de uma dívida).
                  Antes, preciso te conhecer um pouco: são poucas perguntas, cerca de 2 minutos.
                </p>
                <p className="text-xs text-muted-foreground">
                  Se você quer usar só a rotina, pode ignorar este bloco.
                </p>
                <Link href="/financas" className={buttonVariants()}>
                  Começar a controlar meus gastos <ArrowRightIcon />
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        {/* Rotina */}
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <CardTitle>Rotina de hoje</CardTitle>
            <Link href="/rotina" className="text-xs text-muted-foreground underline">
              Abrir rotina
            </Link>
          </CardHeader>
          <CardContent className="grid gap-3">
            {board.length === 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Monte a sua rotina: hábitos para marcar todo dia (como “tomar creatina” ou “beber 2 litros de
                  água”), tarefas e lembretes.
                </p>
                <Link href="/rotina" className={buttonVariants()}>
                  Montar minha rotina <ArrowRightIcon />
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-muted-foreground tabular-nums">
                    {total === 0
                      ? "Nenhum hábito para hoje"
                      : done === total
                        ? `Tudo feito por hoje (${done} de ${total})`
                        : `${done} de ${total} hábitos feitos`}
                  </span>
                  {pendingTasks > 0 && (
                    <Link href="/rotina?aba=hoje" className="text-xs underline">
                      {pendingTasks} {pendingTasks === 1 ? "tarefa" : "tarefas"} para hoje
                    </Link>
                  )}
                </div>
                {todayHabits.length > 0 && (
                  <ul className="divide-y divide-border">
                    {todayHabits.slice(0, 6).map((h) => (
                      <HabitRow key={h.id} habit={h} today={today} manage={false} />
                    ))}
                  </ul>
                )}
                {todayHabits.length > 6 && (
                  <Link href="/rotina" className="text-xs text-muted-foreground underline">
                    Ver todos os {todayHabits.length} hábitos de hoje
                  </Link>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bloco de notas */}
      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <NotebookPenIcon className="size-5 text-muted-foreground" aria-hidden /> Bloco de notas
          </h2>
          <div className="flex items-center gap-3">
            {notes.length > 0 && (
              <Link href="/rotina?aba=notas" className="text-xs text-muted-foreground underline">
                Ver todas
              </Link>
            )}
            <NoteDialog />
          </div>
        </div>

        {notes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma nota ainda. Anote ideias, listas e lembranças aqui.
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <li key={note.id}>
                <NoteCard note={note} lines={4} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
