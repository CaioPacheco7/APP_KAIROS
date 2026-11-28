import {
  ArrowDownLeftIcon,
  CalendarClockIcon,
  CalendarXIcon,
  CheckIcon,
  PiggyBankIcon,
  ReceiptTextIcon,
} from "lucide-react";
import { connection } from "next/server";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { ConfirmButton } from "@/components/confirm-button";
import { HealthCard } from "@/components/health/health-card";
import { MonthSwitcher } from "@/components/month-switcher";
import { RecurrenceDialog } from "@/components/recurrences/recurrence-dialog";
import { SubscriptionsCard } from "@/components/recurrences/subscriptions-card";
import { BudgetCard } from "@/components/budget/budget-card";
import { getBudgetOverview } from "@/server/budget-data";
import { Metric } from "@/components/viz/metric";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDayMonth, monthBounds, parseMonth, todayISO } from "@/lib/dates";
import { Money } from "@/components/app/money";
import { formatBRL } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { summarizeSubscriptions } from "@/lib/finance/subscriptions";
import { getMonthSnapshot } from "@/server/health";
import { getCategoryNames, getFormOptions, getProfile, getRecurrences } from "@/server/queries";
import { PaidButton } from "@/components/recurrences/paid-button";
import { removeRecurrenceAction } from "@/server/recurrences";

export const metadata = { title: "Meu mês · KAIROS" };

type Instance = {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  status: "pending" | "settled";
  description: string | null;
  before_start: boolean;
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
  const profile = await getProfile();
  const startedOn = profile?.onboarded_at ? todayISO(new Date(profile.onboarded_at)) : null;
  const [{ data }, recurrences, categoryNames, budget] = await Promise.all([
    db
      .from("transactions")
      .select("id, type, amount, date, status, description, before_start")
      .is("deleted_at", null)
      .not("recurrence_id", "is", null)
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: true }),
    getRecurrences(),
    getCategoryNames(),
    getBudgetOverview(month, today),
  ]);
  const subscriptions = summarizeSubscriptions(recurrences, categoryNames, today);

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

      {/* Indicadores do mês (mesma grade da Visão geral; cabe no celular) */}
      <div className="glass-inner animate-rise grid grid-cols-2 gap-[7px] rounded-[20px] p-1.5 lg:grid-cols-4" style={{ "--d": "120ms" } as React.CSSProperties}>
        <Metric label="Renda do mês" icon={ArrowDownLeftIcon} value={snapshot.income} footer={`${formatBRL(snapshot.incomeSettled)} já recebido`} />
        <Metric label="Contas fixas" icon={CalendarClockIcon} value={billsTotal} footer={`${formatBRL(billsPaid)} já pago`} />
        <Metric label="Gasto total do mês" icon={ReceiptTextIcon} value={snapshot.committed} footer="fixas, dia a dia e cartão" />
        <Metric
          label="Sobra prevista"
          icon={PiggyBankIcon}
          value={remaining}
          format={remaining < 0 ? "brl-signed" : "brl"}
          highlight
          footer={snapshot.health.perDay ? `≈ ${formatBRL(snapshot.health.perDay)} por dia` : "no fim do mês"}
        />
      </div>

      <section className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
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
                  <InstanceRow key={i.id} item={i} today={today} startedOn={startedOn} />
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
                  <InstanceRow key={b.id} item={b} today={today} startedOn={startedOn} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <BudgetCard
        overview={budget}
        categories={categories.filter((c) => c.type === "expense").map((c) => ({ id: c.id, name: c.name }))}
        className="animate-rise"
        style={{ "--d": "240ms" } as React.CSSProperties}
      />

      <SubscriptionsCard
        {...subscriptions}
        fixedTotal={billsTotal}
        className="animate-rise"
        style={{ "--d": "250ms" } as React.CSSProperties}
      />

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
                      <span className="block text-[0.6875rem] sm:text-[0.5625rem] tracking-widest text-muted-foreground uppercase">dia</span>
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] leading-snug font-medium max-sm:line-clamp-2 max-sm:whitespace-normal max-sm:break-words">
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
                    <Money>{formatBRL(r.amount)}</Money>
                  </p>
                  <div className="flex shrink-0 items-center">
                    <RecurrenceDialog accounts={accountOptions} categories={categoryOptions} recurrence={r} />
                    <form action={removeRecurrenceAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmButton
                        message={`Encerrar "${r.description}"? As parcelas pendentes daqui para frente somem; o que já foi pago fica no histórico.`}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground max-sm:px-2"
                      >
                        <CalendarXIcon className="sm:hidden" aria-hidden />
                        <span className="max-sm:sr-only">Encerrar</span>
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

function InstanceRow({ item, today, startedOn }: { item: Instance; today: string; startedOn: string | null }) {
  const settled = item.status === "settled";
  const overdue = !settled && item.date < today;
  const isIncome = item.type === "income";
  const day = item.date.slice(8, 10);

  return (
    // celular: o botão vai para uma segunda linha (mais espaço para o nome e o valor)
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:gap-x-3.5">
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-[12px] text-center leading-none",
          settled ? "bg-gold-soft text-gold" : overdue ? "bg-destructive/10 text-destructive" : "glass-inner",
        )}
      >
        {settled ? (
          <CheckIcon className="size-5" aria-hidden />
        ) : (
          <span>
            <span className="block font-display text-xl tabular-nums">{day}</span>
            <span className="block text-[0.6875rem] sm:text-[0.5625rem] tracking-widest uppercase opacity-70">dia</span>
          </span>
        )}
      </span>

      <div className="min-w-0">
        <p className={cn("truncate text-[0.9375rem] font-medium", settled && "text-muted-foreground line-through")}>
          {item.description ?? (isIncome ? "Entrada" : "Conta")}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {overdue ? (
            <span className="font-medium text-destructive">Atrasada · venceu {formatDayMonth(item.date)}</span>
          ) : settled ? (
            `${isIncome ? "Recebida" : "Paga"} · ${formatDayMonth(item.date)}${item.before_start ? " · antes de começar" : ""}`
          ) : (
            `${isIncome ? "Previsto" : "Vence"} ${formatDayMonth(item.date)}`
          )}
        </p>
      </div>

      <p className={cn("text-[0.9375rem] font-bold tabular-nums", isIncome && !settled && "text-money-in")}>
        <Money>{formatBRL(item.amount)}</Money>
      </p>

      <PaidButton
        id={item.id}
        settled={settled}
        income={isIncome}
        askBeforeStart={startedOn !== null && item.date < startedOn}
        className="col-span-2 col-start-2 justify-self-end sm:col-span-1 sm:col-start-auto"
      />
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}
