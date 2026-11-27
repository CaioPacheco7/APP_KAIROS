"use client";

import Link from "next/link";
import { CreditCardIcon, PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDayMonth, isISODate } from "@/lib/dates";
import { installmentLabel, invoiceDates, invoiceFor, invoiceName } from "@/lib/finance/cards";
import { centsToInput, formatBRL, parseMoneyToCents } from "@/lib/money";
import { useServerForm } from "@/lib/use-server-form";
import { cn } from "@/lib/utils";
import { saveTransactionAction } from "@/server/transactions";
import { dockPlusClass } from "@/components/shell/styles";
import {
  TRANSACTION_TYPE_LABEL,
  type Transaction,
  type TransactionType,
} from "@/types/database";

export type AccountOption = { id: string; name: string };
export type CategoryOption = { id: string; name: string; type: "income" | "expense" };
export type CardOption = { id: string; name: string; closingDay: number; dueDay: number };

type Props = {
  accounts: AccountOption[];
  categories: CategoryOption[];
  cards?: CardOption[];
  today: string;
  /** Se informado, o diálogo edita esta transação. */
  transaction?: Transaction;
  /** "dock" = o "+" redondo no meio da doca do celular */
  trigger?: "button" | "dock";
};

const INSTALLMENT_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 21, 24, 36, 48];

export function TransactionDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(props.transaction);

  return (
    <>
      {editing ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Editar transação"
          onClick={() => setOpen(true)}
        >
          <PencilIcon />
        </Button>
      ) : props.trigger === "dock" ? (
        <button type="button" aria-label="Novo lançamento" onClick={() => setOpen(true)} className={dockPlusClass}>
          <PlusIcon className="size-6" strokeWidth={2.4} aria-hidden />
        </button>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)} className="max-[420px]:px-2.5">
          <PlusIcon /> <span className="max-[420px]:sr-only">Novo</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar transação" : "Nova transação"}</DialogTitle>
            <DialogDescription>
              {props.transaction?.installment_group_id
                ? "Compra parcelada no cartão."
                : "Receita, despesa (na conta ou no cartão) ou transferência."}
            </DialogDescription>
          </DialogHeader>
          {props.accounts.length === 0 && (props.cards ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Antes, crie uma conta em{" "}
              <Link href="/contas" className="underline" onClick={() => setOpen(false)}>
                Contas
              </Link>
              .
            </p>
          ) : props.transaction?.installment_group_id ? (
            <InstallmentForm {...props} transaction={props.transaction} onDone={() => setOpen(false)} />
          ) : (
            // montado só quando aberto: cada abertura começa com o formulário limpo
            <TransactionForm {...props} onDone={() => setOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CategorySelect({
  categories,
  type,
  defaultValue,
  error,
}: {
  categories: CategoryOption[];
  type: "income" | "expense";
  defaultValue: string;
  error?: string;
}) {
  return (
    <Field label="Categoria" htmlFor="tx-category" error={error}>
      <NativeSelect key={type} id="tx-category" name="category_id" defaultValue={defaultValue}>
        <option value="">Sem categoria</option>
        {categories
          .filter((c) => c.type === type)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </NativeSelect>
    </Field>
  );
}

function TransactionForm({
  accounts,
  categories,
  cards = [],
  today,
  transaction,
  onDone,
}: Props & { onDone: () => void }) {
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const [source, setSource] = useState(
    transaction?.card_id ? `c:${transaction.card_id}` : `a:${transaction?.account_id ?? accounts[0]?.id ?? ""}`,
  );
  const [amountText, setAmountText] = useState(transaction ? centsToInput(transaction.amount) : "");
  const [date, setDate] = useState(transaction?.date ?? today);
  const [installments, setInstallments] = useState(1);
  const { pending, onSubmit, fieldError, formError } = useServerForm(
    saveTransactionAction,
    () => {
      toast.success(transaction ? "Transação atualizada" : "Transação salva");
      onDone();
    },
  );

  const isTransfer = type === "transfer";
  // No cartão só entram despesas: ao trocar o tipo, volta para a primeira conta.
  const card = type === "expense" && source.startsWith("c:") ? cards.find((c) => `c:${c.id}` === source) : undefined;
  const effectiveSource = !card && source.startsWith("c:") ? `a:${accounts[0]?.id ?? ""}` : source;
  const amount = parseMoneyToCents(amountText);

  let invoiceHint: string | null = null;
  if (card && isISODate(date)) {
    const cycle = { closingDay: card.closingDay, dueDay: card.dueDay };
    const month = invoiceFor(date, cycle);
    invoiceHint = `Entra na ${invoiceName(month, today)} (vence ${formatDayMonth(invoiceDates(month, cycle).due)}).`;
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      {transaction && <input type="hidden" name="id" value={transaction.id} />}
      <input type="hidden" name="type" value={type} />

      <div role="group" aria-label="Tipo" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {(["expense", "income", "transfer"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={type === t}
            onClick={() => setType(t)}
            className={cn(
              "rounded-md px-2 py-1.5 text-sm transition-colors",
              type === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {TRANSACTION_TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)" htmlFor="tx-amount" error={fieldError("amount")}>
          <Input
            id="tx-amount"
            name="amount"
            inputMode="decimal"
            placeholder="0,00"
            autoComplete="off"
            autoFocus
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            aria-invalid={Boolean(fieldError("amount"))}
          />
        </Field>
        <Field label="Data" htmlFor="tx-date" error={fieldError("date")}>
          <Input id="tx-date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <div className={cn("grid grid-cols-1 gap-3", (isTransfer || (card && !transaction)) && "grid-cols-2")}>
        <Field
          label={isTransfer ? "Conta de origem" : type === "expense" && cards.length > 0 ? "Conta ou cartão" : "Conta"}
          htmlFor="tx-source"
          error={fieldError("source")}
        >
          <NativeSelect
            id="tx-source"
            name="source"
            value={effectiveSource}
            onChange={(e) => setSource(e.target.value)}
          >
            {type === "expense" && cards.length > 0 ? (
              <>
                <optgroup label="Contas">
                  {accounts.map((a) => (
                    <option key={a.id} value={`a:${a.id}`}>
                      {a.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Cartões de crédito">
                  {cards.map((c) => (
                    <option key={c.id} value={`c:${c.id}`}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              </>
            ) : (
              accounts.map((a) => (
                <option key={a.id} value={`a:${a.id}`}>
                  {a.name}
                </option>
              ))
            )}
          </NativeSelect>
        </Field>

        {isTransfer && (
          <Field label="Conta de destino" htmlFor="tx-to" error={fieldError("transfer_account_id")}>
            <NativeSelect
              id="tx-to"
              name="transfer_account_id"
              defaultValue={transaction?.transfer_account_id ?? accounts[1]?.id ?? ""}
            >
              <option value="">Escolha…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}

        {card && !transaction && (
          <Field label="Parcelas" htmlFor="tx-installments" error={fieldError("installments")}>
            <NativeSelect
              id="tx-installments"
              name="installments"
              value={String(installments)}
              onChange={(e) => setInstallments(Number(e.target.value))}
            >
              {INSTALLMENT_CHOICES.map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "À vista" : `${n}x`}
                </option>
              ))}
            </NativeSelect>
          </Field>
        )}
      </div>

      {card && (
        <p className="-mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
          <CreditCardIcon className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            {installments > 1 && amount !== null && amount >= installments && (
              <strong className="font-semibold text-foreground">{installmentLabel(amount, installments, formatBRL)}. </strong>
            )}
            {invoiceHint}
            {installments > 1 && " Cada parcela conta no mês dela."}
          </span>
        </p>
      )}

      {!isTransfer && (
        <CategorySelect
          categories={categories}
          type={type === "income" ? "income" : "expense"}
          defaultValue={transaction?.type === type ? (transaction.category_id ?? "") : ""}
          error={fieldError("category_id")}
        />
      )}

      <Field label="Descrição" htmlFor="tx-description" error={fieldError("description")}>
        <Input
          id="tx-description"
          name="description"
          placeholder="Ex.: café na padaria"
          autoComplete="off"
          defaultValue={transaction?.description ?? ""}
        />
      </Field>

      {/* Compra no cartão já aconteceu; ela sai da conta quando a fatura for paga. */}
      {!card && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="settled"
            defaultChecked={transaction ? transaction.status === "settled" : true}
            className="size-4 accent-[var(--primary)]"
          />
          Já aconteceu (conta no saldo agora)
        </label>
      )}

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}

/** Parcela: muda descrição e categoria da compra toda (RN-09). */
function InstallmentForm({
  categories,
  transaction,
  onDone,
}: Props & { transaction: Transaction; onDone: () => void }) {
  const { pending, onSubmit, fieldError, formError } = useServerForm(saveTransactionAction, () => {
    toast.success("Parcelas atualizadas");
    onDone();
  });
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      <input type="hidden" name="id" value={transaction.id} />
      <p className="glass-inner rounded-[12px] p-3 text-[0.8125rem] text-muted-foreground">
        Parcela {transaction.installment_number} de {transaction.installment_total}. O que mudar aqui vale para todas as
        parcelas. Para mudar o valor ou o número de parcelas, exclua a compra e lance de novo.
      </p>
      <CategorySelect
        categories={categories}
        type="expense"
        defaultValue={transaction.category_id ?? ""}
        error={fieldError("category_id")}
      />
      <Field label="Descrição" htmlFor="tx-description" error={fieldError("description")}>
        <Input id="tx-description" name="description" autoComplete="off" defaultValue={transaction.description ?? ""} />
      </Field>
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
