import { connection } from "next/server";
import Link from "next/link";
import { CategoryBars } from "@/components/charts/category-bars";
import { MonthlyChart, type MonthlyPoint } from "@/components/charts/monthly-chart";
import { HealthCard } from "@/components/health/health-card";
import { MonthSwitcher } from "@/components/month-switcher";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDateBR,
  formatDayMonth,
  lastMonths,
  monthBounds,
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

  const noAccounts = accounts.length === 0;

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Visão geral</h1>
          <p className="text-sm text-muted-foreground">
            Onde você está, neste mês e nos últimos seis.
          </p>
        </div>
        <MonthSwitcher basePath="/dashboard" month={month} />
      </header>

      {noAccounts && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">Comece criando uma conta</p>
              <p className="text-sm text-muted-foreground">
                Informe quanto você tem hoje. Depois é só registrar o que entra e sai.
              </p>
            </div>
            <Link href="/contas" className={buttonVariants()}>
              Criar conta
            </Link>
          </CardContent>
        </Card>
      )}

      <HealthCard health={snapshot.health} />

      {/* Número principal + resumo do mês */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <Card>
          <CardContent className="grid gap-1">
            <span className="text-sm text-muted-foreground">Saldo total</span>
            <span className="text-4xl font-semibold tabular-nums">
              {formatBRL(totalBalance)}
            </span>
            <span className="text-xs text-muted-foreground">
              {accounts.length} {accounts.length === 1 ? "conta" : "contas"}
            </span>
          </CardContent>
        </Card>
        <StatTile
          label="Receitas do mês"
          value={formatBRL(income)}
          note={incomePending > 0 ? `+ ${formatBRL(incomePending)} a receber` : undefined}
        />
        <StatTile
          label="Despesas do mês"
          value={formatBRL(expense)}
          note={expensePending > 0 ? `+ ${formatBRL(expensePending)} a pagar` : undefined}
        />
        <StatTile
          label="Resultado do mês"
          value={`${income - expense >= 0 ? "+ " : "− "}${formatBRL(Math.abs(income - expense))}`}
          note={income - expense >= 0 ? "Sobrou no mês" : "Gastou mais do que entrou"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gasto por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBars items={categoryItems} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receitas × despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyChart data={chartData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Últimas transações</CardTitle>
            <Link href="/transacoes" className="text-xs text-muted-foreground underline">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma transação ainda. Tente a aba Registrar.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">
                        {t.description ??
                          (t.type === "income" ? "Receita" : t.type === "expense" ? "Despesa" : "Transferência")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateBR(t.date)} · {accountNames.get(t.account_id) ?? "Conta"}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium tabular-nums">
                      {t.type === "income" ? "+ " : t.type === "expense" ? "− " : "⇄ "}
                      {formatBRL(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Hoje na rotina</CardTitle>
            <Link href="/rotina" className="text-xs text-muted-foreground underline">
              Abrir rotina
            </Link>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nada pendente para hoje.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {tasks.map((t) => {
                  const overdue = t.due_date !== null && t.due_date < today;
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <span className="truncate">{t.title}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline">
                          {t.kind === "reminder" ? "Lembrete" : "Tarefa"}
                        </Badge>
                        <span className={overdue ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                          {overdue && t.due_date ? `atrasada ${formatDayMonth(t.due_date)}` : "hoje"}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card>
      <CardContent className="grid gap-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </CardContent>
    </Card>
  );
}
