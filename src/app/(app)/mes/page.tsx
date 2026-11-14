import { CheckIcon, RotateCcwIcon } from "lucide-react";
import { connection } from "next/server";
import { HealthCard } from "@/components/health/health-card";
import { MonthSwitcher } from "@/components/month-switcher";
import { ConfirmButton } from "@/components/confirm-button";
import { RecurrenceDialog } from "@/components/recurrences/recurrence-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDayMonth, monthBounds, parseMonth } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { getMonthSnapshot } from "@/server/health";
import { getFormOptions, getRecurrences } from "@/server/queries";
import { removeRecurrenceAction, setPaidAction } from "@/server/recurrences";

export const metadata = { title: "Meu mês · KAIROS" };

type Instance = {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  status: "pending" | "settled";
  description: string | null;
};

export default async function MesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const sp = await searchParams;
  const { accounts, categories, today } = await getFormOptions();
  const month = parseMonth(sp.mes, today.slice(0, 7));

  // Gera as contas fixas do mês (se faltarem) e calcula o semáforo.
  const snapshot = await getMonthSnapshot(month, today);

  const { start, end } = monthBounds(month);
  const db = await createClient();
  const [{ data }, recurrences] = await Promise.all([
    db
      .from("transactions")
      .select("id, type, amount, date, status, description")
      .is("deleted_at", null)
      .not("recurrence_id", "is", null)
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: true }),
    getRecurrences(),
  ]);

  const instances = (data ?? []) as Instance[];
  const incomes = instances.filter((i) => i.type === "income");
  const bills = instances.filter((i) => i.type === "expense");

  const billsTotal = bills.reduce((s, b) => s + b.amount, 0);
  const billsPaid = bills.filter((b) => b.status === "settled").reduce((s, b) => s + b.amount, 0);

  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name, type: c.type }));

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Meu mês</h1>
          <p className="text-sm text-muted-foreground">
            O que entra, o que vence e como o mês está.
          </p>
        </div>
        <MonthSwitcher basePath="/mes" month={month} />
      </header>

      <HealthCard health={snapshot.health} />

      <div className="grid gap-3 sm:grid-cols-4">
        <Tile label="Renda do mês" value={formatBRL(snapshot.income)} note={`${formatBRL(snapshot.incomeSettled)} já recebido`} />
        <Tile label="Contas fixas" value={formatBRL(billsTotal)} note={`${formatBRL(billsPaid)} já pago`} />
        <Tile label="Gasto total do mês" value={formatBRL(snapshot.committed)} note="fixas + dia a dia" />
        <Tile
          label="Sobra prevista"
          value={`${snapshot.health.remaining < 0 ? "− " : ""}${formatBRL(Math.abs(snapshot.health.remaining))}`}
          note={snapshot.health.perDay ? `≈ ${formatBRL(snapshot.health.perDay)} por dia` : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Entradas do mês</CardTitle>
          </CardHeader>
          <CardContent>
            {incomes.length === 0 ? (
              <Empty>Nenhuma entrada cadastrada para este mês.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {incomes.map((i) => (
                  <InstanceRow key={i.id} item={i} today={today} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contas do mês</CardTitle>
          </CardHeader>
          <CardContent>
            {bills.length === 0 ? (
              <Empty>Nenhuma conta fixa neste mês. Cadastre abaixo.</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {bills.map((b) => (
                  <InstanceRow key={b.id} item={b} today={today} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Contas fixas cadastradas</CardTitle>
          <RecurrenceDialog accounts={accountOptions} categories={categoryOptions} />
        </CardHeader>
        <CardContent>
          {recurrences.length === 0 ? (
            <Empty>Nada cadastrado ainda.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {recurrences.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">
                      {r.description}
                      {r.kind === "income" && (
                        <Badge variant="outline" className="ml-2">
                          Entrada
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">todo dia {r.day_of_month}</p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <span className="mr-2 font-medium tabular-nums">{formatBRL(r.amount)}</span>
                    <RecurrenceDialog accounts={accountOptions} categories={categoryOptions} recurrence={r} />
                    <form action={removeRecurrenceAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmButton
                        message={`Encerrar "${r.description}"? As parcelas pendentes daqui para frente somem; o que já foi pago fica no histórico.`}
                        variant="ghost"
                        size="sm"
                      >
                        Encerrar
                      </ConfirmButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InstanceRow({ item, today }: { item: Instance; today: string }) {
  const settled = item.status === "settled";
  const overdue = !settled && item.date < today;
  const isIncome = item.type === "income";

  return (
    <li className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className={settled ? "truncate text-muted-foreground line-through" : "truncate"}>
          {item.description ?? (isIncome ? "Entrada" : "Conta")}
        </p>
        <p className="text-xs text-muted-foreground">
          {overdue ? (
            <span className="text-destructive">Atrasada · venceu {formatDayMonth(item.date)}</span>
          ) : settled ? (
            `${isIncome ? "Recebida" : "Paga"} · ${formatDayMonth(item.date)}`
          ) : (
            `${isIncome ? "Previsto" : "Vence"} ${formatDayMonth(item.date)}`
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-medium tabular-nums">{formatBRL(item.amount)}</span>
        <form action={setPaidAction}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="paid" value={String(!settled)} />
          <Button type="submit" variant={settled ? "ghost" : "outline"} size="sm">
            {settled ? (
              <>
                <RotateCcwIcon /> Desfazer
              </>
            ) : (
              <>
                <CheckIcon /> {isIncome ? "Recebi" : "Paguei"}
              </>
            )}
          </Button>
        </form>
      </div>
    </li>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card size="sm">
      <CardContent className="grid gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold tabular-nums">{value}</span>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}
