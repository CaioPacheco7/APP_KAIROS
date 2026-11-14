import { ReceiptTextIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { MonthSwitcher } from "@/components/month-switcher";
import { TransactionItem } from "@/components/transactions/transaction-item";
import { TransactionRowActions } from "@/components/transactions/transaction-row-actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { formatLongDate, monthBounds, parseMonth } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  getAccountNames,
  getCategoryNames,
  getFormOptions,
} from "@/server/queries";
import {
  TRANSACTION_TYPE_LABEL,
  type Transaction,
  type TransactionType,
} from "@/types/database";

export const metadata = { title: "Transações · KAIROS" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES: TransactionType[] = ["income", "expense", "transfer"];

const single = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // A hora atual só pode ser lida em tempo de requisição (não na pré-renderização).
  await connection();
  const sp = await searchParams;
  const { accounts, categories, today } = await getFormOptions();
  const accountNames = await getAccountNames();
  const categoryNames = await getCategoryNames();

  const month = parseMonth(sp.mes, today.slice(0, 7));
  const accountFilter = UUID_RE.test(single(sp.conta) ?? "") ? single(sp.conta)! : undefined;
  const categoryFilter = UUID_RE.test(single(sp.categoria) ?? "") ? single(sp.categoria)! : undefined;
  const typeParam = single(sp.tipo);
  const typeFilter = TYPES.find((t) => t === typeParam);

  const { start, end } = monthBounds(month);
  const db = await createClient();
  let query = db
    .from("transactions")
    .select(
      "id, type, amount, date, status, description, notes, account_id, category_id, transfer_account_id",
    )
    .is("deleted_at", null)
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (accountFilter) {
    query = query.or(
      `account_id.eq.${accountFilter},transfer_account_id.eq.${accountFilter}`,
    );
  }
  if (categoryFilter) query = query.eq("category_id", categoryFilter);
  if (typeFilter) query = query.eq("type", typeFilter);

  const { data } = await query;
  const transactions = (data ?? []) as Transaction[];

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  // Agrupa por dia (a lista já vem ordenada do mais novo para o mais antigo)
  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const list = groups.get(t.date) ?? [];
    list.push(t);
    groups.set(t.date, list);
  }

  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name, type: c.type }));
  const hasFilters = Boolean(accountFilter || categoryFilter || typeFilter);

  return (
    <div className="grid grid-cols-1 gap-8">
      <PageHeader
        eyebrow="Finanças"
        title="Transações"
        description="Tudo que entrou e saiu, dia a dia."
        actions={
          <MonthSwitcher
            basePath="/transacoes"
            month={month}
            params={{ conta: accountFilter, categoria: categoryFilter, tipo: typeFilter }}
          />
        }
      />

      {/* Resumo do período */}
      <Card className="animate-rise" size="sm" style={{ "--d": "60ms" } as React.CSSProperties}>
        <CardContent className="grid grid-cols-1 gap-4 divide-y divide-border sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-y-0">
          <Total label="Entradas" value={formatBRL(income)} valueClass="text-money-in" />
          <Total label="Saídas" value={formatBRL(expense)} className="pt-4 sm:pt-0 sm:pl-5" />
          <Total
            label="Resultado"
            value={`${income - expense < 0 ? "− " : ""}${formatBRL(Math.abs(income - expense))}`}
            className="pt-4 sm:pt-0 sm:pl-5"
          />
        </CardContent>
      </Card>

      {/* Filtros */}
      <form method="get" className="animate-rise flex flex-wrap items-end gap-3" style={{ "--d": "100ms" } as React.CSSProperties}>
        <input type="hidden" name="mes" value={month} />
        <Field label="Tipo" htmlFor="f-tipo" className="w-40">
          <NativeSelect id="f-tipo" name="tipo" defaultValue={typeFilter ?? ""}>
            <option value="">Todos</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TRANSACTION_TYPE_LABEL[t]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Conta" htmlFor="f-conta" className="w-48">
          <NativeSelect id="f-conta" name="conta" defaultValue={accountFilter ?? ""}>
            <option value="">Todas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Categoria" htmlFor="f-categoria" className="w-52">
          <NativeSelect id="f-categoria" name="categoria" defaultValue={categoryFilter ?? ""}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {hasFilters && (
          <Link href={`/transacoes?mes=${month}`} className={buttonVariants({ variant: "ghost" })}>
            Limpar
          </Link>
        )}
      </form>

      {/* Lista por dia */}
      {transactions.length === 0 ? (
        <EmptyState icon={ReceiptTextIcon} title="Nada por aqui">
          {hasFilters
            ? "Nenhuma movimentação com esses filtros neste mês."
            : "Nenhuma movimentação neste mês. Use o botão Novo ou a aba Registrar."}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {[...groups.entries()].map(([date, items], gi) => {
            const dayTotal = items.reduce(
              (s, t) => s + (t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : 0),
              0,
            );
            return (
              <section
                key={date}
                className="animate-rise"
                style={{ "--d": `${Math.min(gi, 6) * 50}ms` } as React.CSSProperties}
              >
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 className="text-sm font-medium first-letter:uppercase">{formatLongDate(date)}</h2>
                  <span className={cn("text-xs tabular-nums", dayTotal > 0 ? "text-money-in" : "text-muted-foreground")}>
                    {dayTotal > 0 ? "+ " : dayTotal < 0 ? "− " : ""}
                    {formatBRL(Math.abs(dayTotal))}
                  </span>
                </div>
                <Card size="sm">
                  <CardContent>
                    <ul className="divide-y divide-border">
                      {items.map((t) => (
                        <TransactionItem
                          key={t.id}
                          transaction={t}
                          showDate={false}
                          accountName={accountNames.get(t.account_id)}
                          toAccountName={t.transfer_account_id ? accountNames.get(t.transfer_account_id) : undefined}
                          categoryName={t.category_id ? categoryNames.get(t.category_id) : null}
                          actions={
                            <TransactionRowActions
                              transaction={t}
                              accounts={accountOptions}
                              categories={categoryOptions}
                              today={today}
                            />
                          }
                        />
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Total({
  label,
  value,
  className,
  valueClass,
}: {
  label: string;
  value: string;
  className?: string;
  valueClass?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-3xl leading-none tracking-normal tabular-nums", valueClass)}>{value}</p>
    </div>
  );
}
