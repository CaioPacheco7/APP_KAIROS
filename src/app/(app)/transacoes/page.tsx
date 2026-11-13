import { connection } from "next/server";
import Link from "next/link";
import { MonthSwitcher } from "@/components/month-switcher";
import { TransactionRowActions } from "@/components/transactions/transaction-row-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateBR, monthBounds, parseMonth } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
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

  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name, type: c.type }));
  const hasFilters = Boolean(accountFilter || categoryFilter || typeFilter);

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Transações</h1>
          <p className="text-sm text-muted-foreground">
            Tudo que entrou e saiu, mês a mês.
          </p>
        </div>
        <MonthSwitcher
          basePath="/transacoes"
          month={month}
          params={{ conta: accountFilter, categoria: categoryFilter, tipo: typeFilter }}
        />
      </header>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="mes" value={month} />
        <Field label="Tipo" htmlFor="f-tipo" className="w-36">
          <NativeSelect id="f-tipo" name="tipo" defaultValue={typeFilter ?? ""}>
            <option value="">Todos</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TRANSACTION_TYPE_LABEL[t]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Conta" htmlFor="f-conta" className="w-44">
          <NativeSelect id="f-conta" name="conta" defaultValue={accountFilter ?? ""}>
            <option value="">Todas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Categoria" htmlFor="f-categoria" className="w-48">
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
          <Link
            href={`/transacoes?mes=${month}`}
            className={buttonVariants({ variant: "ghost" })}
          >
            Limpar
          </Link>
        )}
      </form>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile label="Receitas" value={formatBRL(income)} />
        <SummaryTile label="Despesas" value={formatBRL(expense)} />
        <SummaryTile label="Resultado" value={formatBRL(income - expense)} />
      </div>

      {transactions.length === 0 ? (
        <Card>
          <CardContent className="grid gap-1 py-10 text-center">
            <p className="font-medium">Nada por aqui</p>
            <p className="text-sm text-muted-foreground">
              {hasFilters
                ? "Nenhuma transação com esses filtros neste mês."
                : "Nenhuma transação neste mês. Use o botão Novo ou a aba Registrar."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateBR(t.date)}
                    </TableCell>
                    <TableCell>
                      <span>{t.description ?? TRANSACTION_TYPE_LABEL[t.type]}</span>
                      {t.status === "pending" && (
                        <Badge variant="outline" className="ml-2">
                          Agendada
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.type === "transfer"
                        ? "Transferência"
                        : (t.category_id && categoryNames.get(t.category_id)) || "Sem categoria"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {accountNames.get(t.account_id) ?? "—"}
                      {t.type === "transfer" && t.transfer_account_id
                        ? ` → ${accountNames.get(t.transfer_account_id) ?? "—"}`
                        : ""}
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
                      {t.type === "income" ? "+ " : t.type === "expense" ? "− " : "⇄ "}
                      {formatBRL(t.amount)}
                    </TableCell>
                    <TableCell>
                      <TransactionRowActions
                        transaction={t}
                        accounts={accountOptions}
                        categories={categoryOptions}
                        today={today}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent className="grid gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  );
}
