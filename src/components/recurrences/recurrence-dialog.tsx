"use client";

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
import { saveRecurrenceAction } from "@/server/recurrences";
import type { Recurrence } from "@/types/database";

type AccountOption = { id: string; name: string };
type CategoryOption = { id: string; name: string; type: "income" | "expense" };

type Props = {
  accounts: AccountOption[];
  categories: CategoryOption[];
  recurrence?: Recurrence;
};

export function RecurrenceDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(props.recurrence);

  return (
    <>
      {editing ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Editar ${props.recurrence!.description}`}
          onClick={() => setOpen(true)}
        >
          <PencilIcon />
        </Button>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          <PlusIcon /> Nova conta fixa
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar conta fixa" : "Nova conta fixa"}</DialogTitle>
            <DialogDescription>
              Se repete todo mês. Ela aparece em “Meu mês” como agendada, e você
              marca “paguei” quando pagar.
            </DialogDescription>
          </DialogHeader>
          {props.accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Crie uma conta na aba Contas antes de cadastrar contas fixas.
            </p>
          ) : (
            <RecurrenceForm {...props} onDone={() => setOpen(false)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function RecurrenceForm({
  accounts,
  categories,
  recurrence,
  onDone,
}: Props & { onDone: () => void }) {
  const [kind, setKind] = useState<"income" | "expense">(recurrence?.kind ?? "expense");
  const { pending, onSubmit, fieldError, formError } = useServerForm(
    saveRecurrenceAction,
    () => {
      toast.success(recurrence ? "Conta fixa atualizada" : "Conta fixa criada");
      onDone();
    },
  );
  const typedCategories = categories.filter((c) => c.type === kind);

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      {recurrence && <input type="hidden" name="id" value={recurrence.id} />}
      <input type="hidden" name="kind" value={kind} />

      <div role="group" aria-label="Tipo" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(
          [
            ["expense", "Despesa"],
            ["income", "Entrada"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            onClick={() => setKind(value)}
            className={cn(
              "rounded-md px-2 py-1.5 text-sm transition-colors",
              kind === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Field label="Nome" htmlFor="rc-desc" error={fieldError("description")}>
        <Input
          id="rc-desc"
          name="description"
          placeholder={kind === "income" ? "Ex.: Salário" : "Ex.: Luz, Aluguel, Consórcio da moto"}
          autoComplete="off"
          autoFocus
          defaultValue={recurrence?.description ?? ""}
        />
      </Field>

      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <Field label="Valor (R$)" htmlFor="rc-amount" error={fieldError("amount")}>
          <Input
            id="rc-amount"
            name="amount"
            inputMode="decimal"
            placeholder="0,00"
            autoComplete="off"
            defaultValue={recurrence ? centsToInput(recurrence.amount) : ""}
          />
        </Field>
        <Field label="Todo dia" htmlFor="rc-day" error={fieldError("day")}>
          <Input
            id="rc-day"
            name="day"
            inputMode="numeric"
            maxLength={2}
            placeholder="10"
            defaultValue={recurrence?.day_of_month ?? ""}
          />
        </Field>
      </div>

      <Field label="Conta" htmlFor="rc-account" error={fieldError("account_id")}>
        <NativeSelect
          id="rc-account"
          name="account_id"
          defaultValue={recurrence?.account_id ?? accounts[0]?.id}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field label="Categoria" htmlFor="rc-category" error={fieldError("category_id")}>
        <NativeSelect
          key={kind}
          id="rc-category"
          name="category_id"
          defaultValue={recurrence && recurrence.kind === kind ? (recurrence.category_id ?? "") : ""}
        >
          <option value="">Sem categoria</option>
          {typedCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      {!recurrence && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Primeira cobrança</legend>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="radio" name="start_next_month" value="" defaultChecked className="mt-0.5 size-4 accent-[var(--primary)]" />
            <span>
              Este mês
              <span className="block text-xs text-muted-foreground">Aparece em “Contas do mês” para marcar quando pagar.</span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-sm">
            <input type="radio" name="start_next_month" value="on" className="mt-0.5 size-4 accent-[var(--primary)]" />
            <span>
              Só no mês que vem
              <span className="block text-xs text-muted-foreground">Este mês já está resolvido (ou ainda não começou).</span>
            </span>
          </label>
        </fieldset>
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
