"use client";

import Link from "next/link";
import { PencilIcon, PlusIcon } from "lucide-react";
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
import { centsToInput } from "@/lib/money";
import { useServerForm } from "@/lib/use-server-form";
import { cn } from "@/lib/utils";
import { saveTransactionAction } from "@/server/transactions";
import {
  TRANSACTION_TYPE_LABEL,
  type Transaction,
  type TransactionType,
} from "@/types/database";

export type AccountOption = { id: string; name: string };
export type CategoryOption = { id: string; name: string; type: "income" | "expense" };

type Props = {
  accounts: AccountOption[];
  categories: CategoryOption[];
  today: string;
  /** Se informado, o diálogo edita esta transação. */
  transaction?: Transaction;
};

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
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          <PlusIcon /> Novo
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar transação" : "Nova transação"}</DialogTitle>
            <DialogDescription>
              Receita, despesa ou transferência entre suas contas.
            </DialogDescription>
          </DialogHeader>
          {props.accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Antes, crie uma conta em{" "}
              <Link href="/contas" className="underline" onClick={() => setOpen(false)}>
                Contas
              </Link>
              .
            </p>
          ) : (
            // montado só quando aberto: cada abertura começa com o formulário limpo
            <TransactionForm {...props} onDone={() => setOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TransactionForm({
  accounts,
  categories,
  today,
  transaction,
  onDone,
}: Props & { onDone: () => void }) {
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "expense");
  const { pending, onSubmit, fieldError, formError } = useServerForm(
    saveTransactionAction,
    () => {
      toast.success(transaction ? "Transação atualizada" : "Transação salva");
      onDone();
    },
  );

  const isTransfer = type === "transfer";
  const typedCategories = categories.filter((c) => c.type === type);

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
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
            defaultValue={transaction ? centsToInput(transaction.amount) : ""}
            aria-invalid={Boolean(fieldError("amount"))}
          />
        </Field>
        <Field label="Data" htmlFor="tx-date" error={fieldError("date")}>
          <Input
            id="tx-date"
            name="date"
            type="date"
            className="[color-scheme:dark]"
            defaultValue={transaction?.date ?? today}
          />
        </Field>
      </div>

      <div className={cn("grid gap-3", isTransfer && "grid-cols-2")}>
        <Field
          label={isTransfer ? "Conta de origem" : "Conta"}
          htmlFor="tx-account"
          error={fieldError("account_id")}
        >
          <NativeSelect
            id="tx-account"
            name="account_id"
            defaultValue={transaction?.account_id ?? accounts[0]?.id}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
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
      </div>

      {!isTransfer && (
        <Field label="Categoria" htmlFor="tx-category" error={fieldError("category_id")}>
          <NativeSelect
            key={type}
            id="tx-category"
            name="category_id"
            defaultValue={
              transaction?.type === type ? (transaction.category_id ?? "") : ""
            }
          >
            <option value="">Sem categoria</option>
            {typedCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
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

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="settled"
          defaultChecked={transaction ? transaction.status === "settled" : true}
          className="size-4 accent-[var(--primary)]"
        />
        Já aconteceu (conta no saldo agora)
      </label>

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
