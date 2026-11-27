import {
  ArrowDownLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  CalendarCheckIcon,
  CircleAlertIcon,
  ClockIcon,
  CoinsIcon,
  FlagIcon,
  ScaleIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/app/panel";
import { CategoryBars } from "@/components/charts/category-bars";
import { HealthSummary } from "@/components/health/health-card";
import { MonthSwitcher } from "@/components/month-switcher";
import { ActivityTable, type ActivityRow } from "@/components/transactions/activity-table";
import { buttonVariants } from "@/components/ui/button";
import { Count } from "@/components/viz/count";
import { FlowChart, type FlowPoint } from "@/components/viz/flow-chart";
import { Delta, Metric } from "@/components/viz/metric";
import { SpendStack, type SpendColumn } from "@/components/viz/spend-stack";
import {
  formatDayMonth,
  lastMonths,
  monthBounds,
  monthLabel,
  monthShort,
  parseMonth,
  shiftMonth,
} from "@/lib/dates";
import { Money } from "@/components/app/money";
import { formatBRL } from "@/lib/money";
import { dueState } from "@/lib/notices";
import { createClient } from "@/lib/supabase/server";
import { capitalize, cn } from "@/lib/utils";
import { pctChange } from "@/lib/viz";
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

type ExpenseRow = { amount: number; date: string; recurrence_id: string | null };
type BillRow = { id: string; amount: number; date: string; description: string | null };
type GoalRow = { id: string; kind: "purchase" | "debt"; title: string; target_amount: number };

const monthName = (m: string) => monthLabel(m).split(" ")[0];

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
  const { start, end } = monthBounds(month);
  const prevMonth = shiftMonth(month, -1);

  // Gera as contas fixas do mês (se faltarem) ANTES de ler os totais abaixo.
  const snapshot = await getMonthSnapshot(month, today);

  const db = await createClient();
  const [accounts, balances, categoryNames, summaryRes, spendingRes, recentRes, expensesRes, billsRes, goalsRes, progressRes] =
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
        .limit(12),
      db
        .from("transactions")
        .select("amount, date, recurrence_id")
        .is("deleted_at", null)
        .eq("type", "expense")
        .eq("status", "settled")
        .gte("date", `${months[0]}-01`)
        .lt("date", end),
      db
        .from("transactions")
        .select("id, amount, date, description")
        .is("deleted_at", null)
        .eq("type", "expense")
        .eq("status", "pending")
        .gte("date", start)
        .lt("date", end)
        .order("date", { ascending: true })
        .limit(4),
      db
        .from("goals")
        .select("id, kind, title, target_amount")
        .is("deleted_at", null)
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .limit(3),
      db.from("v_goal_progress").select("goal_id, contributed"),
    ]);

  const summaries = (summaryRes.data ?? []) as MonthlySummary[];
  const byMonth = new Map(summaries.map((s) => [s.month.slice(0, 7), s]));
  const current = byMonth.get(month);
  const previous = byMonth.get(prevMonth);

  const income = Number(current?.income_settled ?? 0);
  const expense = Number(current?.expense_settled ?? 0);
  const incomePending = Number(current?.income_pending ?? 0);
  const expensePending = Number(current?.expense_pending ?? 0);
  const result = income - expense;
  const prevIncome = Number(previous?.income_settled ?? 0);
  const prevExpense = Number(previous?.expense_settled ?? 0);

  const totalBalance = accounts.reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);
  const isCurrentMonth = month === today.slice(0, 7);
  const perDay = snapshot.health.perDay;

  const flow: FlowPoint[] = months.map((m) => ({
    key: m,
    label: monthShort(m),
    fullLabel: monthLabel(m),
    income: Number(byMonth.get(m)?.income_settled ?? 0),
    expense: Number(byMonth.get(m)?.expense_settled ?? 0),
  }));

  // Saídas pagas de cada mês, separadas em contas fixas e dia a dia
  const split = new Map(months.map((m) => [m, { fixed: 0, daily: 0 }]));
  for (const row of (expensesRes.data ?? []) as ExpenseRow[]) {
    const bucket = split.get(row.date.slice(0, 7));
    if (!bucket) continue;
    if (row.recurrence_id) bucket.fixed += Number(row.amount);
    else bucket.daily += Number(row.amount);
  }
  const spend: SpendColumn[] = months.map((m) => ({
    key: m,
    label: monthShort(m),
    fullLabel: monthLabel(m),
    ...split.get(m)!,
  }));

  const categoryItems = ((spendingRes.data ?? []) as SpendingByCategory[]).map((r) => ({
    label: r.category_id ? (categoryNames.get(r.category_id) ?? "Categoria") : "Sem categoria",
    total: Number(r.total),
  }));

  const accountNames = new Map(accounts.map((a) => [a.id, a.name]));
  const activity: ActivityRow[] = ((recentRes.data ?? []) as Transaction[]).map((t) => ({
    id: t.id,
    title: t.description ?? (t.type === "income" ? "Receita" : t.type === "expense" ? "Despesa" : "Transferência"),
    category:
      t.type === "transfer"
        ? `→ ${t.transfer_account_id ? (accountNames.get(t.transfer_account_id) ?? "Conta") : "Conta"}`
        : t.category_id
          ? (categoryNames.get(t.category_id) ?? "Categoria")
          : "Sem categoria",
    account: accountNames.get(t.account_id) ?? "Conta",
    date: formatDayMonth(t.date),
    amount: Number(t.amount),
    type: t.type,
    pending: t.status === "pending",
  }));

  const bills = (billsRes.data ?? []) as BillRow[];
  const contributed = new Map(
    ((progressRes.data ?? []) as { goal_id: string; contributed: number }[]).map((p) => [p.goal_id, Number(p.contributed)]),
  );
  const goals = ((goalsRes.data ?? []) as GoalRow[]).map((g) => {
    const done = contributed.get(g.id) ?? 0;
    const target = Number(g.target_amount);
    return { ...g, done, target, ratio: target > 0 ? Math.min(done / target, 1) : 0 };
  });

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader
        eyebrow="Finanças"
        title="Visão geral"
        description="Saldo, o que entrou e saiu, e o que precisa da sua atenção neste mês."
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

      <div className="stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[1.05fr_1fr_1.05fr]">
        {/* Saldo (o número principal da tela) */}
        <Panel
          title="Saldo total"
          action={<span className="rounded-[6px] bg-raised px-1.5 py-1 text-[0.625rem] font-extrabold">BRL</span>}
          headerClassName="items-center mb-2"
        >
          <p className="text-[clamp(2.4rem,3.9vw,3.55rem)] leading-[1.02] font-extrabold tracking-[-0.07em]">
            <Count value={totalBalance} />
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.6875rem] font-semibold text-muted-foreground">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 font-extrabold",
                result >= 0
                  ? "bg-[color-mix(in_oklab,var(--status-good)_13%,transparent)] text-good"
                  : "bg-[color-mix(in_oklab,var(--status-critical)_12%,transparent)] text-risk",
              )}
            >
              {result >= 0 ? <ArrowUpRightIcon className="size-3" aria-hidden /> : <ArrowDownLeftIcon className="size-3" aria-hidden />}
              {result >= 0 ? "+ " : "− "}<Money>{formatBRL(Math.abs(result))}</Money>
            </span>
            <span>{result >= 0 ? "sobrou" : "faltou"} em {monthName(month)}</span>
          </div>
          <div className="mt-3.5 mb-3 grid grid-cols-2 gap-1.5">
            <Link href="/mes" className={buttonVariants({ size: "sm" })}>
              Meu mês <ArrowUpRightIcon />
            </Link>
            <Link href="/contas" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Contas <ArrowRightIcon />
            </Link>
          </div>
          {accounts.length > 0 && (
            <ul aria-label="Saldo por conta" className="glass-inner flex rounded-[12px] px-0.5 py-2">
              {accounts.slice(0, 3).map((a, i) => (
                <li key={a.id} className={cn("min-w-0 flex-1 px-2", i > 0 && "border-l border-line")}>
                  <span className="block truncate text-[0.5625rem] font-semibold text-muted-foreground">{a.name}</span>
                  <strong className="mt-1 block truncate text-[0.6875rem] font-extrabold"><Money>{formatBRL(balances.get(a.id) ?? 0)}</Money></strong>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Indicadores do mês */}
        <div className="glass-inner grid min-w-0 grid-cols-2 gap-[7px] rounded-[20px] p-1.5">
          <Metric
            label="Entradas"
            icon={ArrowDownLeftIcon}
            value={income}
            footer={
              incomePending > 0 ? (
                <span>+ <Money>{formatBRL(incomePending)}</Money> a receber</span>
              ) : (
                <Delta change={pctChange(income, prevIncome)} goodWhen="up" vs={`vs ${monthName(prevMonth)}`} />
              )
            }
          />
          <Metric
            label="Saídas"
            icon={ArrowUpRightIcon}
            value={expense}
            footer={
              expensePending > 0 ? (
                <span>+ <Money>{formatBRL(expensePending)}</Money> a pagar</span>
              ) : (
                <Delta change={pctChange(expense, prevExpense)} goodWhen="down" vs={`vs ${monthName(prevMonth)}`} />
              )
            }
          />
          <Metric
            label="Resultado"
            icon={ScaleIcon}
            value={result}
            format="brl-signed"
            footer={income === 0 && expense === 0 ? "Ainda sem movimento pago" : result >= 0 ? "Sobrou no mês" : "Gastou mais do que entrou"}
          />
          {isCurrentMonth && perDay !== null ? (
            <Metric
              label="Pode gastar por dia"
              icon={CoinsIcon}
              value={Math.max(perDay, 0)}
              highlight
              footer="até o fim do mês, sem passar do limite"
            />
          ) : (
            <Metric
              label="Comprometido"
              icon={CoinsIcon}
              value={Math.round(snapshot.health.ratio ?? 0)}
              format="percent"
              highlight
              footer="da renda do mês"
            />
          )}
        </div>

        {/* Saídas por mês */}
        <Panel
          title="Saídas por mês"
          subtitle="O que já foi pago: contas fixas e dia a dia"
          className="md:col-span-2 xl:col-span-1"
        >
          <SpendStack columns={spend} />
        </Panel>

        {/* Lateral: semáforo + contas a pagar */}
        <div className="grid min-w-0 content-start gap-3 md:col-span-2 md:grid-cols-2 xl:col-span-1 xl:grid-cols-1">
          <Panel title="Saúde do mês" subtitle={monthLabel(month)} headerClassName="sr-only">
            <HealthSummary health={snapshot.health} />
          </Panel>
          <Panel
            title="Contas a pagar"
            subtitle={bills.length > 0 ? "Pendentes neste mês" : "Tudo pago neste mês"}
            action={
              <Link href="/mes" aria-label="Abrir Meu mês" className="glass-inner grid size-9 place-items-center rounded-full transition-colors hover:bg-raised">
                <ArrowUpRightIcon className="size-4" aria-hidden />
              </Link>
            }
          >
            {bills.length === 0 ? (
              <p className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
                <CalendarCheckIcon className="size-4 text-good" aria-hidden /> Nenhuma conta pendente.
              </p>
            ) : (
              <ul className="grid gap-1.5">
                {bills.map((b) => {
                  const state = dueState(b.date, today);
                  return (
                    <li key={b.id} className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-[11px]",
                          state === "overdue"
                            ? "bg-[color-mix(in_oklab,var(--status-critical)_13%,transparent)] text-risk"
                            : "glass-inner text-muted-foreground",
                        )}
                      >
                        {state === "overdue" ? <CircleAlertIcon className="size-4" aria-hidden /> : <ClockIcon className="size-4" aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-[0.75rem] font-bold">{b.description ?? "Conta"}</strong>
                        <small className={cn("block text-[0.625rem] font-semibold", state === "overdue" ? "text-risk" : "text-muted-foreground")}>
                          {state === "overdue"
                            ? `Atrasada · venceu ${formatDayMonth(b.date)}`
                            : state === "today"
                              ? "Vence hoje"
                              : `Vence ${formatDayMonth(b.date)}`}
                        </small>
                      </span>
                      <span className="shrink-0 text-[0.75rem] font-extrabold tabular-nums"><Money>{formatBRL(Number(b.amount))}</Money></span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
          <Panel
            title="Seus planos"
            subtitle={goals.length > 0 ? "Quanto já foi guardado ou pago" : "Conquistar algo ou sair de uma dívida"}
            className="md:col-span-2 xl:col-span-1"
            action={
              <Link href="/planejar" aria-label="Abrir Planejar" className="glass-inner grid size-9 place-items-center rounded-full transition-colors hover:bg-raised">
                <ArrowUpRightIcon className="size-4" aria-hidden />
              </Link>
            }
          >
            {goals.length === 0 ? (
              <Link href="/planejar" className="flex items-center gap-2 text-[0.8125rem] font-semibold text-muted-foreground hover:text-foreground">
                <FlagIcon className="size-4 text-gold" aria-hidden /> Criar o primeiro plano
              </Link>
            ) : (
              <ul className="grid gap-3">
                {goals.map((g, i) => (
                  <li key={g.id} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-[0.75rem]">
                      <span className="min-w-0 truncate font-bold">
                        {g.title}
                        <span className="ml-1.5 text-[0.625rem] font-semibold text-muted-foreground">
                          {g.kind === "debt" ? "dívida" : "conquista"}
                        </span>
                      </span>
                      <span className="shrink-0 font-extrabold tabular-nums">{Math.round(g.ratio * 100)}%</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={`${g.title}: ${formatBRL(g.done)} de ${formatBRL(g.target)}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(g.ratio * 100)}
                      className="h-2 overflow-hidden rounded-full bg-gold-soft"
                    >
                      <div
                        className="animate-grow-x h-full rounded-full bg-(--series-habit)"
                        style={{ width: `${Math.max(g.ratio * 100, 2)}%`, ["--d" as string]: `${220 + i * 60}ms` }}
                      />
                    </div>
                    <p className="text-[0.625rem] font-semibold text-muted-foreground tabular-nums">
                      <Money>{formatBRL(g.done)}</Money> de <Money>{formatBRL(g.target)}</Money>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Últimas movimentações */}
        <Panel
          title="Últimas movimentações"
          className="md:col-span-2"
          action={
            <Link href="/transacoes" className="text-[0.6875rem] font-bold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Ver todas
            </Link>
          }
        >
          {activity.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma movimentação ainda. Experimente a aba Registrar.
            </p>
          ) : (
            <ActivityTable rows={activity} />
          )}
        </Panel>
      </div>

      <div className="stagger grid grid-cols-1 gap-3 xl:grid-cols-[1.75fr_1fr]">
        <Panel title="Entradas e saídas" subtitle="Os últimos seis meses, em reais (o que já foi pago ou recebido)">
          <FlowChart points={flow} />
        </Panel>
        <Panel title="Para onde foi o dinheiro" subtitle={capitalize(monthLabel(month))}>
          <CategoryBars items={categoryItems} />
        </Panel>
      </div>
    </div>
  );
}
