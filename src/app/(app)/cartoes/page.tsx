import {
  CircleAlertIcon,
  CircleCheckIcon,
  ClockIcon,
  CreditCardIcon,
  LockIcon,
  ReceiptTextIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState } from "@/components/app/empty-state";
import { IconChip } from "@/components/app/icon-chip";
import { Money } from "@/components/app/money";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/app/panel";
import { CardDialog } from "@/components/cards/card-dialog";
import { PayInvoiceDialog } from "@/components/cards/pay-invoice-dialog";
import { DeleteOrArchive } from "@/components/app/delete-or-archive";
import { OpeningDialog } from "@/components/cards/opening-dialog";
import { cardOptions } from "@/components/transactions/options";
import { TransactionItem } from "@/components/transactions/transaction-item";
import { TransactionRowActions } from "@/components/transactions/transaction-row-actions";

import { Count } from "@/components/viz/count";
import { formatDayMonth, monthShort, shiftMonth } from "@/lib/dates";
import {
  INVOICE_STATE_LABEL,
  describeInvoice,
  nextDueInvoice,
  invoiceName,
  invoiceWhen,
  type Invoice,
  type InvoiceState,
} from "@/lib/finance/cards";
import { formatBRL } from "@/lib/money";
import { capitalize, cn } from "@/lib/utils";
import { getCardSummaries, getInvoiceItems, type CardSummary } from "@/server/card-data";
import { deleteCardAction } from "@/server/cards";
import { createClient } from "@/lib/supabase/server";
import { getAccountNames, getCategoryNames, getFormOptions } from "@/server/queries";

export const metadata = { title: "Cartões · KAIROS" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const single = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const pct = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** Ícone e cor de cada situação (sempre com texto ao lado). */
const STATE_STYLE: Record<InvoiceState, { icon: LucideIcon; className: string }> = {
  open: { icon: ClockIcon, className: "text-muted-foreground" },
  closed: { icon: LockIcon, className: "text-warn" },
  overdue: { icon: CircleAlertIcon, className: "text-risk" },
  paid: { icon: CircleCheckIcon, className: "text-good" },
  future: { icon: ClockIcon, className: "text-muted-foreground" },
};

function StateLine({ invoice, className }: { invoice: Invoice; className?: string }) {
  const { icon: Icon, className: tone } = STATE_STYLE[invoice.state];
  return (
    <p className={cn("flex items-center gap-1.5 text-[0.6875rem] font-bold", tone, className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span>
        {INVOICE_STATE_LABEL[invoice.state]} · {invoiceWhen(invoice)}
      </span>
    </p>
  );
}

/** Quanto mostrar em destaque: o que falta pagar (ou o total, se ainda aberta). */
const headline = (i: Invoice) => (i.state === "open" || i.state === "future" ? i.charges - i.paid : i.remaining);

export default async function CartoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const sp = await searchParams;
  const { accounts, categories, cards, today } = await getFormOptions();
  const summaries = await getCardSummaries(today);
  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));
  const db = await createClient();
  const movements = new Map(
    await Promise.all(
      summaries.map(async (s) => {
        const { count } = await db
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .eq("card_id", s.card.id);
        return [s.card.id, count ?? 0] as const;
      }),
    ),
  );

  const selected =
    summaries.find((s) => s.card.id === single(sp.cartao) && UUID_RE.test(single(sp.cartao) ?? "")) ?? summaries[0];

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader
        eyebrow="Finanças"
        title="Cartões"
        description="Faturas, parcelas e limite. A compra no cartão conta como gasto no dia; pagar a fatura só tira o dinheiro da conta."
        actions={<CardDialog accounts={accountOptions} today={today} />}
      />

      {summaries.length === 0 ? (
        <EmptyState icon={CreditCardIcon} title="Nenhum cartão ainda">
          Cadastre o cartão com os dias de fechamento e de vencimento. Depois, ao lançar uma despesa, escolha o cartão e
          o número de parcelas: cada parcela vai para a fatura certa.
        </EmptyState>
      ) : (
        <>
          <ul className="stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {summaries.map((s) => (
              <li key={s.card.id}>
                <CardTile
                  summary={s}
                  active={s.card.id === selected?.card.id}
                  accounts={accountOptions}
                  today={today}
                  showLink={summaries.length > 1}
                  movements={movements.get(s.card.id) ?? 0}
                />
              </li>
            ))}
          </ul>

          {selected && (
            <InvoiceDetail
              summary={selected}
              month={MONTH_RE.test(single(sp.fatura) ?? "") ? single(sp.fatura)! : selected.current.month}
              today={today}
              accounts={accountOptions}
              categories={categories.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
              cardChoices={cardOptions(cards)}
            />
          )}

          <FutureInstallments summaries={summaries} today={today} />
        </>
      )}
    </div>
  );
}

function CardTile({
  summary,
  active,
  accounts,
  today,
  showLink,
  movements,
}: {
  summary: CardSummary;
  active: boolean;
  accounts: { id: string; name: string }[];
  today: string;
  showLink: boolean;
  movements: number;
}) {
  const { card, current, usage } = summary;
  const canPay = current.remaining > 0 && current.state !== "future";
  return (
    <article
      className={cn(
        "glass-panel flex h-full min-w-0 flex-col gap-4 rounded-[20px] p-4 sm:p-5",
        active && showLink && "outline-2 outline-offset-2 outline-ring/60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <IconChip icon={CreditCardIcon} tone="gold" className="size-10 rounded-[12px] max-[360px]:hidden" />
          <div className="min-w-0">
            <p className="truncate font-bold">{card.name}</p>
            <p className="text-xs text-muted-foreground">
              fecha dia {card.closing_day} · vence dia {card.due_day}
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-[0.6875rem] font-semibold text-muted-foreground">
          {capitalize(invoiceName(current.month, today))}
          {current.state === "open" ? "" : " · falta pagar"}
        </p>
        <p className="mt-1 text-[clamp(1.9rem,3.2vw,2.6rem)] leading-none font-extrabold tracking-[-0.06em]">
          <Count value={Math.max(headline(current), 0)} />
        </p>
        <StateLine invoice={current} className="mt-2" />
      </div>

      <div className="grid gap-1.5">
        {usage.ratio !== null ? (
          <>
            <div className="flex items-baseline justify-between gap-2 text-[0.6875rem] font-semibold">
              <span className="text-muted-foreground">
                Limite usado: <Money>{formatBRL(usage.used)}</Money>
              </span>
              <span className={cn("font-bold", usage.available < 0 && "text-risk")}>
                {usage.available >= 0 ? (
                  <>
                    <Money>{formatBRL(usage.available)}</Money> livre
                  </>
                ) : (
                  <>
                    passou <Money>{formatBRL(-usage.available)}</Money>
                  </>
                )}
              </span>
            </div>
            <div
              role="meter"
              aria-label={`Limite usado: ${formatBRL(usage.used)} de ${formatBRL(card.credit_limit)} (${pct.format(usage.ratio * 100)}%)`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(Math.round(usage.ratio * 100), 100)}
              className="h-2 overflow-hidden rounded-full bg-gold-soft"
            >
              <div
                className="animate-grow-x h-full rounded-full bg-(--series-habit)"
                style={{ width: `${Math.max(Math.min(usage.ratio, 1) * 100, 2)}%` }}
              />
            </div>
            <p className="text-[0.6875rem] sm:text-[0.625rem] text-muted-foreground">
              de <Money>{formatBRL(card.credit_limit)}</Money>, contando as parcelas futuras
            </p>
          </>
        ) : (
          <p className="text-[0.6875rem] text-muted-foreground">
            Limite não informado. Edite o cartão para ver quanto ainda está livre.
          </p>
        )}
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        {canPay && (
          <PayInvoiceDialog
            cardId={card.id}
            cardName={card.name}
            month={current.month}
            invoiceLabel={invoiceName(current.month, today)}
            remaining={current.remaining}
            accounts={accounts}
            defaultAccountId={card.default_account_id}
            today={today}
            variant={current.state === "open" ? "outline" : "default"}
          />
        )}
        {showLink && !active && (
          <Link
            href={`/cartoes?cartao=${card.id}`}
            className="touch-hit inline-flex min-h-8 items-center rounded-full px-3 text-[0.8125rem] font-bold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Ver faturas
          </Link>
        )}
      </div>
      <div className="-mx-1 -mb-1 flex flex-wrap items-center gap-1 border-t border-line pt-2">
        <CardDialog card={card} accounts={accounts} today={today} />
        <OpeningDialog cardId={card.id} cardName={card.name} dueLabel={formatDayMonth(nextDueInvoice(summary.cycle, today).due)} />
        <DeleteOrArchive id={card.id} name={card.name} noun="cartão" movements={movements} action={deleteCardAction} />
      </div>
    </article>
  );
}

async function InvoiceDetail({
  summary,
  month,
  today,
  accounts,
  categories,
  cardChoices,
}: {
  summary: CardSummary;
  month: string;
  today: string;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; type: "income" | "expense" }[];
  cardChoices: ReturnType<typeof cardOptions>;
}) {
  const { card, cycle, invoices, current } = summary;
  const [items, accountNames, categoryNames] = await Promise.all([
    getInvoiceItems(card.id, month),
    getAccountNames(),
    getCategoryNames(),
  ]);
  const invoice =
    invoices.find((i) => i.month === month) ?? describeInvoice({ month, charges: 0, paid: 0, items: 0 }, cycle, today);
  const purchases = items.filter((t) => t.type === "expense");
  const payments = items.filter((t) => t.type === "transfer");

  // Linha do tempo: 3 faturas antes da atual até a última com parcelas (no máximo 9)
  const first = shiftMonth(current.month, -3);
  const lastWithData = invoices.length > 0 ? invoices[invoices.length - 1].month : current.month;
  const months: string[] = [];
  for (let m = first; m <= lastWithData || m <= current.month; m = shiftMonth(m, 1)) {
    months.push(m);
    if (months.length >= 9) break;
  }
  if (!months.includes(month)) months.push(month);
  months.sort();
  const byMonth = new Map(invoices.map((i) => [i.month, i]));

  return (
    <Panel
      title={`Faturas do ${card.name}`}
      subtitle="Escolha um mês para ver as compras e os pagamentos"
      className="animate-rise"
    >
      <nav aria-label="Faturas" className="no-scrollbar -mx-1 overflow-x-auto px-1 pb-1">
        <ul className="flex w-max gap-1.5">
          {months.map((m) => {
            const inv = byMonth.get(m) ?? describeInvoice({ month: m, charges: 0, paid: 0, items: 0 }, cycle, today);
            const isSelected = m === month;
            const { icon: Icon, className: tone } = STATE_STYLE[inv.state];
            return (
              <li key={m}>
                <Link
                  href={`/cartoes?cartao=${card.id}&fatura=${m}`}
                  aria-current={isSelected ? "page" : undefined}
                  className={cn(
                    "grid min-w-[92px] gap-0.5 rounded-[14px] px-3 py-2 text-left transition-colors outline-none focus-visible:outline-2 focus-visible:outline-ring",
                    isSelected ? "bg-pick text-pick-ink" : "glass-inner hover:bg-raised",
                  )}
                >
                  <span className="text-[0.6875rem] font-extrabold tracking-wide uppercase">
                    {monthShort(m)}
                    {m.slice(0, 4) !== today.slice(0, 4) && ` ${m.slice(2, 4)}`}
                  </span>
                  <span className="text-[0.8125rem] font-bold tabular-nums">
                    <Money>{formatBRL(inv.charges)}</Money>
                  </span>
                  <span className={cn("flex items-center gap-1 text-[0.6875rem] sm:text-[0.625rem] font-bold", !isSelected && tone)}>
                    <Icon className="size-3" aria-hidden />
                    {INVOICE_STATE_LABEL[inv.state]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]">
        <div className="glass-inner grid content-start gap-3 self-start rounded-[16px] p-4">
          <div>
            <p className="text-[0.8125rem] font-bold">{capitalize(invoiceName(month, today))}</p>
            <StateLine invoice={invoice} className="mt-1" />
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[0.75rem]">
            <dt className="text-muted-foreground">Compras</dt>
            <dd className="text-right font-bold tabular-nums">
              <Money>{formatBRL(invoice.charges)}</Money>
            </dd>
            <dt className="text-muted-foreground">Pago</dt>
            <dd className="text-right font-bold tabular-nums">
              <Money>{formatBRL(invoice.paid)}</Money>
            </dd>
            <dt className="text-muted-foreground">Falta pagar</dt>
            <dd className="text-right text-[0.9375rem] font-extrabold tabular-nums">
              <Money>{formatBRL(invoice.remaining)}</Money>
            </dd>
            <dt className="text-muted-foreground">Fecha</dt>
            <dd className="text-right font-semibold tabular-nums">{formatDayMonth(invoice.closing)}</dd>
            <dt className="text-muted-foreground">Vence</dt>
            <dd className="text-right font-semibold tabular-nums">{formatDayMonth(invoice.due)}</dd>
          </dl>
          {invoice.remaining > 0 && invoice.state !== "future" && (
            <PayInvoiceDialog
              cardId={card.id}
              cardName={card.name}
              month={month}
              invoiceLabel={invoiceName(month, today)}
              remaining={invoice.remaining}
              accounts={accounts}
              defaultAccountId={card.default_account_id}
              today={today}
              variant={invoice.state === "open" ? "outline" : "default"}
              className="w-full"
            />
          )}
          {invoice.state === "open" && invoice.remaining > 0 && (
            <p className="text-[0.6875rem] text-muted-foreground">
              Ainda aberta: dá para adiantar um pagamento, mas novas compras até {formatDayMonth(invoice.closing)} entram nela.
            </p>
          )}
        </div>

        <div className="grid min-w-0 grid-cols-1 content-start gap-4">
          {purchases.length === 0 ? (
            <div className="glass-inner flex items-center gap-3 rounded-[16px] p-4 text-[0.8125rem] text-muted-foreground">
              <ReceiptTextIcon className="size-4 shrink-0" aria-hidden />
              Nenhuma compra nesta fatura.
            </div>
          ) : (
            <div className="glass-inner min-w-0 rounded-[16px] px-3 py-1.5 sm:px-4">
              <div>
                <p className="pt-1 text-[0.6875rem] font-bold text-muted-foreground">
                  {purchases.length} {purchases.length === 1 ? "compra" : "compras"}
                </p>
                <ul className="divide-y divide-border">
                  {purchases.map((t) => (
                    <TransactionItem
                      key={t.id}
                      transaction={t}
                      categoryName={t.category_id ? categoryNames.get(t.category_id) : null}
                      actions={
                        <TransactionRowActions
                          transaction={t}
                          accounts={accounts}
                          categories={categories}
                          cards={cardChoices}
                          today={today}
                        />
                      }
                    />
                  ))}
                </ul>
              </div>
            </div>
          )}
          {payments.length > 0 && (
            <div className="glass-inner min-w-0 rounded-[16px] px-3 py-1.5 sm:px-4">
              <div>
                <p className="pt-1 text-[0.6875rem] font-bold text-muted-foreground">Pagamentos</p>
                <ul className="divide-y divide-border">
                  {payments.map((t) => (
                    <TransactionItem
                      key={t.id}
                      transaction={t}
                      accountName={t.account_id ? accountNames.get(t.account_id) : undefined}
                      cardName={card.name}
                      actions={
                        <TransactionRowActions transaction={t} accounts={accounts} categories={categories} today={today} />
                      }
                    />
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

/** Parcelas já comprometidas nas próximas faturas (todos os cartões). */
function FutureInstallments({ summaries, today }: { summaries: CardSummary[]; today: string }) {
  const totals = new Map<string, number>();
  for (const s of summaries) {
    for (const i of s.invoices) {
      if (i.state === "future") totals.set(i.month, (totals.get(i.month) ?? 0) + i.charges);
    }
  }
  const rows = [...totals].sort(([a], [b]) => a.localeCompare(b)).slice(0, 12);
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map(([, v]) => v), 1);
  const sum = rows.reduce((s, [, v]) => s + v, 0);

  return (
    <Panel
      title="Parcelas que já estão por vir"
      subtitle={
        <>
          <Money>{formatBRL(sum)}</Money> em compras parceladas nas próximas faturas, somando todos os cartões
        </>
      }
      className="animate-rise"
    >
      <ul className="grid gap-2.5">
        {rows.map(([m, v], i) => (
          <li key={m} className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 text-[0.75rem]">
            <span className="font-bold">
              {capitalize(monthShort(m))}
              {m.slice(0, 4) !== today.slice(0, 4) && <span className="text-muted-foreground"> {m.slice(0, 4)}</span>}
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-track" aria-hidden>
              <span
                className="animate-grow-x block h-full rounded-full bg-(--series-out)"
                style={{ width: `${Math.max((v / max) * 100, 2)}%`, ["--d" as string]: `${120 + i * 40}ms` }}
              />
            </span>
            <span className="font-bold tabular-nums">
              <Money>{formatBRL(v)}</Money>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
