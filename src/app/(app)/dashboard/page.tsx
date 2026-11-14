import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ListChecksIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState } from "@/components/app/empty-state";
import { IconChip, type Tone } from "@/components/app/icon-chip";
import { PageHeader } from "@/components/app/page-header";
import { Hourglass } from "@/components/brand/hourglass";
import { CategoryBars } from "@/components/charts/category-bars";
import { MonthlyChart, type MonthlyPoint } from "@/components/charts/monthly-chart";
import { HealthCard } from "@/components/health/health-card";
import { MonthSwitcher } from "@/components/month-switcher";
import { TransactionItem } from "@/components/transactions/transaction-item";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDayMonth,
  lastMonths,
  monthBounds,
  monthLabel,
  monthShort,
  parseMonth,
} from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { getMonthSnapshot } from "@/server/health";
import {
  getAccounts,
  getBalances,
  getCategoryNames,
  getFormOptions,
} from "@/server/queries";
import type {
  MonthlySummary,
  SpendingByCategory,
  Transaction,
} from "@/types/database";

export const metadata = { title: "Visão geral · KAIROS" };

type TaskRow = {
  id: string;
  kind: "task" | "reminder";
  title: string;
  due_date: string | null;
  remind_at: string | null;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // A hora atual só pode ser lida em tempo de requisição (não na pré-renderização).
  await connection();
  const sp = await searchParams;
  const { today } = await getFormOptions();
  const month = parseMonth(sp.mes, today.slice(0, 7));
  const months = lastMonths(month, 6);
  const { start } = monthBounds(month);

  // Gera as contas fixas do mês (se faltarem) ANTES de ler os totais abaixo.
  const snapshot = await getMonthSnapshot(month, today);

  const db = await createClient();
  const [accounts, balances, categoryNames, summaryRes, spendingRes, recentRes, tasksRes] =
    await Promise.all([
      getAccounts(),
      getBalances(),
      getCategoryNames(),
      db
        .from("v_monthly_summary")
        .select("month, income_settled, expense_settled, income_pending, expense_pending")
        .in("month", months.map((m) => `${m}-01`)),
      db
        .from("v_spending_by_category")
        .select("month, category_id, total")
        .eq("month", start),
      db
        .from("transactions")
        .select("id, type, amount, date, status, description, account_id, category_id, transfer_account_id, notes")
        .is("deleted_at", null)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6),
      db
        .from("tasks")
        .select("id, kind, title, due_date, remind_at")
        .is("deleted_at", null)
        .eq("status", "open")
        .not("due_date", "is", null)
        .lte("due_date", today)
        .order("due_date", { ascending: true })
        .limit(6),
    ]);

  const summaries = (summaryRes.data ?? []) as MonthlySummary[];
  const byMonth = new Map(summaries.map((s) => [s.month.slice(0, 7), s]));
  const current = byMonth.get(month);

  const income = Number(current?.income_settled ?? 0);
  const expense = Number(current?.expense_settled ?? 0);
  const incomePending = Number(current?.income_pending ?? 0);
  const expensePending = Number(current?.expense_pending ?? 0);
  const result = income - expense;

  const totalBalance = accounts.reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);

  const chartData: MonthlyPoint[] = months.map((m) => ({
    month: m,
    label: monthShort(m),
    income: Number(byMonth.get(m)?.income_settled ?? 0),
    expense: Number(byMonth.get(m)?.expense_settled ?? 0),
  }));

  const categoryItems = ((spendingRes.data ?? []) as SpendingByCategory[]).map((r) => ({
    label: r.category_id ? (categoryNames.get(r.category_id) ?? "Categoria") : "Sem categoria",
    total: Number(r.total),
  }));

  const recent = (recentRes.data ?? []) as Transaction[];
  const tasks = (tasksRes.data ?? []) as TaskRow[];
  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));

  return (
    <div className="grid grid-cols-1 gap-8">
      <PageHeader
        eyebrow="Finanças"
        title="Visão geral"
        description="Onde você está neste mês e como foram os últimos seis."
        actions={<MonthSwitcher basePath="/dashboard" month={month} />}
      />

      {accounts.length === 0 && (
        <EmptyState
          icon={WalletIcon}
          title="Comece criando uma conta"
          action={
            <Link href="/contas" className={buttonVariants({ variant: "gold", size: "lg" })}>
              Criar minha primeira conta
            </Link>
          }
        >
          Informe quanto você tem hoje. Depois é só registrar o que entra e o que sai.
        </EmptyState>
      )}

      {/* Saldo + saúde do mês */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="animate-rise relative lg:col-span-3">
          <Hourglass className="pointer-events-none absolute -right-6 -bottom-12 h-60 text-gold-fill opacity-[0.055]" />
          <CardContent className="relative grid gap-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Saldo total</p>
                <p className="mt-2 font-display text-5xl leading-none tracking-normal tabular-nums sm:text-7xl">
                  {formatBRL(totalBalance)}
                </p>
              </div>
              <Link href="/contas" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Ver contas
              </Link>
            </div>

            {accounts.length > 0 && (
              <ul className="grid gap-2.5 sm:grid-cols-3">
                {accounts.slice(0, 3).map((a) => (
                  <li key={a.id} className="rounded-xl border border-border bg-surface-2/60 px-3.5 py-3">
                    <p className="truncate text-xs text-muted-foreground">{a.name}</p>
                    <p className="mt-0.5 text-[0.9375rem] font-medium tabular-nums">
                      {formatBRL(balances.get(a.id) ?? 0)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="animate-rise lg:col-span-2" style={{ "--d": "80ms" } as React.CSSProperties}>
          <HealthCard health={snapshot.health} />
        </div>
      </section>

      {/* Resumo do mês */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi
          icon={ArrowDownLeftIcon}
          tone="sky"
          label="Entradas do mês"
          value={formatBRL(income)}
          note={incomePending > 0 ? `+ ${formatBRL(incomePending)} a receber` : "Já recebido"}
          delay={120}
        />
        <Kpi
          icon={ArrowUpRightIcon}
          tone="ember"
          label="Saídas do mês"
          value={formatBRL(expense)}
          note={expensePending > 0 ? `+ ${formatBRL(expensePending)} a pagar` : "Já pago"}
          delay={180}
        />
        <Kpi
          icon={result >= 0 ? TrendingUpIcon : TrendingDownIcon}
          tone={result >= 0 ? "sage" : "rose"}
          label="Resultado do mês"
          value={`${result >= 0 ? "+ " : "− "}${formatBRL(Math.abs(result))}`}
          note={
            income === 0 && expense === 0
              ? "Ainda sem movimento pago"
              : result >= 0
                ? "Sobrou no mês"
                : "Gastou mais do que entrou"
          }
          delay={240}
        />
      </section>

      {/* Análises */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="animate-rise lg:col-span-2" style={{ "--d": "120ms" } as React.CSSProperties}>
          <CardHeader>
            <CardTitle>Para onde foi o dinheiro</CardTitle>
            <CardDescription className="first-letter:uppercase">{monthLabel(month)}</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBars items={categoryItems} />
          </CardContent>
        </Card>

        <Card className="animate-rise lg:col-span-3" style={{ "--d": "180ms" } as React.CSSProperties}>
          <CardHeader>
            <CardTitle>Entradas e saídas</CardTitle>
            <CardDescription>Os últimos seis meses, o atual em destaque</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyChart data={chartData} />
          </CardContent>
        </Card>
      </section>

      {/* Atividade */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="animate-rise lg:col-span-3" style={{ "--d": "120ms" } as React.CSSProperties}>
          <CardHeader>
            <CardTitle>Últimas movimentações</CardTitle>
            <CardAction>
              <Link href="/transacoes" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Ver todas
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma movimentação ainda. Experimente a aba Registrar.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((t) => (
                  <TransactionItem
                    key={t.id}
                    transaction={t}
                    accountName={accountNames.get(t.account_id)}
                    toAccountName={t.transfer_account_id ? accountNames.get(t.transfer_account_id) : undefined}
                    categoryName={t.category_id ? categoryNames.get(t.category_id) : null}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="animate-rise lg:col-span-2" style={{ "--d": "180ms" } as React.CSSProperties}>
          <CardHeader>
            <CardTitle>Hoje na rotina</CardTitle>
            <CardAction>
              <Link href="/rotina" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Abrir rotina
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="grid justify-items-center gap-2 py-8 text-center">
                <IconChip icon={ListChecksIcon} tone="sage" className="size-11" />
                <p className="text-sm text-muted-foreground">Nada pendente para hoje.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {tasks.map((t) => {
                  const overdue = t.due_date !== null && t.due_date < today;
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span className="min-w-0 flex-1 truncate">{t.title}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline">{t.kind === "reminder" ? "Lembrete" : "Tarefa"}</Badge>
                        <span className={overdue ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>
                          {overdue && t.due_date ? `atrasada · ${formatDayMonth(t.due_date)}` : "hoje"}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Kpi({
  icon,
  tone,
  label,
  value,
  note,
  delay,
}: {
  icon: typeof WalletIcon;
  tone: Tone;
  label: string;
  value: string;
  note?: string;
  delay: number;
}) {
  return (
    <Card className="animate-rise" style={{ "--d": `${delay}ms` } as React.CSSProperties}>
      <CardContent className="flex items-start gap-4">
        <IconChip icon={icon} tone={tone} className="size-11" />
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 font-display text-4xl leading-none tracking-normal tabular-nums">{value}</p>
          {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
