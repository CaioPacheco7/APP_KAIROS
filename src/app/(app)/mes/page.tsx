import { CalendarClockIcon, CheckIcon, RotateCcwIcon } from "lucide-react";
import { connection } from "next/server";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { ConfirmButton } from "@/components/confirm-button";
import { HealthCard } from "@/components/health/health-card";
import { MonthSwitcher } from "@/components/month-switcher";
import { RecurrenceDialog } from "@/components/recurrences/recurrence-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDayMonth, monthBounds, parseMonth } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
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
  const overdue = bills.filter((b) => b.status === "pending" && b.date < today).length;

  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name, type: c.type }));
  const remaining = snapshot.health.remaining;

  return (
    <div className="grid grid-cols-1 gap-8">
      <PageHeader
        eyebrow="Finanças"
        title="Meu mês"
        description="O que entra, o que vence e como o mês está caminhando."
        actions={<MonthSwitcher basePath="/mes" month={month} />}
      />

      <div className="animate-rise" style={{ "--d": "60ms" } as React.CSSProperties}>
        <HealthCard health={snapshot.health} />
      </div>

      {/* Faixa-resumo */}
      <Card className="animate-rise" size="sm" style={{ "--d": "120ms" } as React.CSSProperties}>
        <CardContent className="grid grid-cols-2 gap-y-5 sm:grid-cols-4 sm:divide-x sm:divide-border">
          <Stat label="Renda do mês" value={formatBRL(snapshot.income)} note={`${formatBRL(snapshot.incomeSettled)} já recebido`} />
          <Stat label="Contas fixas" value={formatBRL(billsTotal)} note={`${formatBRL(billsPaid)} já pago`} className="sm:pl-5" />
          <Stat label="Gasto total do mês" value={formatBRL(snapshot.committed)} note="fixas + dia a dia" className="sm:pl-5" />
          <Stat
            label="Sobra prevista"
            value={`${remaining < 0 ? "− " : ""}${formatBRL(Math.abs(remaining))}`}
            note={snapshot.health.perDay ? `≈ ${formatBRL(snapshot.health.perDay)} por dia` : undefined}
            className="sm:pl-5"
          />
        </CardContent>
      </Card>

      <section className="grid items-start gap-5 lg:grid-cols-2">
        <Card className="animate-rise" style={{ "--d": "160ms" } as React.CSSProperties}>
          <CardHeader>
            <CardTitle>Entradas do mês</CardTitle>
            <CardDescription>Marque “Recebi” quando o dinheiro cair</CardDescription>
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

        <Card className="animate-rise" style={{ "--d": "220ms" } as React.CSSProperties}>
          <CardHeader>
            <CardTitle>Contas do mês</CardTitle>
            <CardDescription>
              {overdue > 0
                ? `${overdue} ${overdue === 1 ? "conta atrasada" : "contas atrasadas"}: marque “Paguei” ou exclua`
                : "Marque “Paguei” e o valor sai do saldo"}
            </CardDescription>
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
      </section>

      <Card className="animate-rise" style={{ "--d": "280ms" } as React.CSSProperties}>
        <CardHeader>
          <CardTitle>Contas fixas cadastradas</CardTitle>
          <CardDescription>Se repetem todo mês e aparecem acima como agendadas</CardDescription>
          <CardAction>
            <RecurrenceDialog accounts={accountOptions} categories={categoryOptions} />
          </CardAction>
        </CardHeader>
        <CardContent>
          {recurrences.length === 0 ? (
            <EmptyState icon={CalendarClockIcon} title="Nada cadastrado ainda">
              Cadastre aluguel, luz, internet, parcelas… e elas aparecem todo mês sozinhas.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-border">
              {recurrences.map((r) => (
                <li key={r.id} className="flex items-center gap-3.5 py-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-center leading-none">
                    <span>
                      <span className="block font-display text-xl tabular-nums">{r.day_of_month}</span>
                      <span className="block text-[0.5625rem] tracking-widest text-muted-foreground uppercase">dia</span>
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-medium">
                      {r.description}
                      {r.kind === "income" && (
                        <Badge variant="gold" className="ml-2 align-middle">
                          Entrada
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">todo mês</p>
                  </div>
                  <p className={cn("shrink-0 text-[0.9375rem] font-medium tabular-nums", r.kind === "income" && "text-money-in")}>
                    {formatBRL(r.amount)}
                  </p>
                  <div className="flex shrink-0 items-center">
                    <RecurrenceDialog accounts={accountOptions} categories={categoryOptions} recurrence={r} />
                    <form action={removeRecurrenceAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmButton
                        message={`Encerrar "${r.description}"? As parcelas pendentes daqui para frente somem; o que já foi pago fica no histórico.`}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
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
  const day = item.date.slice(8, 10);

  return (
    <li className="flex items-center gap-3.5 py-3">
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl text-center leading-none",
          settled ? "bg-gold-soft text-gold" : overdue ? "bg-destructive/10 text-destructive" : "bg-muted",
        )}
      >
        {settled ? (
          <CheckIcon className="size-5" aria-hidden />
        ) : (
          <span>
            <span className="block font-display text-xl tabular-nums">{day}</span>
            <span className="block text-[0.5625rem] tracking-widest uppercase opacity-70">dia</span>
          </span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[0.9375rem] font-medium", settled && "text-muted-foreground line-through")}>
          {item.description ?? (isIncome ? "Entrada" : "Conta")}
        </p>
        <p className="text-xs text-muted-foreground">
          {overdue ? (
            <span className="font-medium text-destructive">Atrasada · venceu {formatDayMonth(item.date)}</span>
          ) : settled ? (
            `${isIncome ? "Recebida" : "Paga"} · ${formatDayMonth(item.date)}`
          ) : (
            `${isIncome ? "Previsto" : "Vence"} ${formatDayMonth(item.date)}`
          )}
        </p>
      </div>

      <p className={cn("shrink-0 text-[0.9375rem] font-medium tabular-nums", isIncome && !settled && "text-money-in")}>
        {formatBRL(item.amount)}
      </p>

      <form action={setPaidAction} className="shrink-0">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="paid" value={String(!settled)} />
        <Button type="submit" variant={settled ? "ghost" : "outline"} size="sm" className={cn(settled && "text-muted-foreground")}>
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
    </li>
  );
}

function Stat({
  label,
  value,
  note,
  className,
}: {
  label: string;
  value: string;
  note?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl leading-none tracking-normal tabular-nums">{value}</p>
      {note && <p className="mt-1.5 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}
