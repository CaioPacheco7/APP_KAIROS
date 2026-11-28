"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDayMonth } from "@/lib/dates";
import { nextDueInvoice } from "@/lib/finance/cards";
import { centsToInput } from "@/lib/money";
import { useServerForm } from "@/lib/use-server-form";
import { saveCardAction } from "@/server/cards";
import { OpeningFields } from "./opening-fields";

export type CardValues = {
  id: string;
  name: string;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  default_account_id: string | null;
};

/** Novo cartão ou editar um cartão (nome, limite, fechamento, vencimento). */
export function CardDialog({
  card,
  accounts,
  today,
}: {
  card?: CardValues;
  accounts: { id: string; name: string }[];
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(card);
  return (
    <>
      {editing ? (
        <Button variant="ghost" size="sm" aria-label={`Editar ${card!.name}`} className="text-muted-foreground" onClick={() => setOpen(true)}>
          <PencilIcon /> Editar
        </Button>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          <PlusIcon /> Novo cartão
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cartão" : "Novo cartão"}</DialogTitle>
            <DialogDescription>
              Os dias de fechamento e de vencimento estão na fatura do banco. Compra feita no dia do fechamento ou
              depois entra na fatura seguinte.
            </DialogDescription>
          </DialogHeader>
          <CardForm card={card} accounts={accounts} today={today} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function CardForm({
  card,
  accounts,
  today,
  onDone,
}: {
  card?: CardValues;
  accounts: { id: string; name: string }[];
  today: string;
  onDone: () => void;
}) {
  const [closing, setClosing] = useState(card ? String(card.closing_day) : "");
  const [due, setDue] = useState(card ? String(card.due_day) : "");
  const c = Number(closing);
  const d = Number(due);
  const validCycle = Number.isInteger(c) && Number.isInteger(d) && c >= 1 && c <= 31 && d >= 1 && d <= 31 && c !== d;
  const dueLabel = validCycle ? formatDayMonth(nextDueInvoice({ closingDay: c, dueDay: d }, today).due) : null;
  const { pending, onSubmit, fieldError, formError } = useServerForm(saveCardAction, () => {
    toast.success(card ? "Cartão atualizado" : "Cartão criado");
    onDone();
  });
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      {card && <input type="hidden" name="id" value={card.id} />}
      <Field label="Nome" htmlFor="cc-name" error={fieldError("name")}>
        <Input
          id="cc-name"
          name="name"
          placeholder="Ex.: Nubank, Inter"
          autoComplete="off"
          autoFocus
          defaultValue={card?.name ?? ""}
          aria-invalid={Boolean(fieldError("name"))}
        />
      </Field>
      <Field label="Limite (R$)" htmlFor="cc-limit" error={fieldError("credit_limit")} hint="Opcional. Serve para mostrar quanto ainda está disponível.">
        <Input
          id="cc-limit"
          name="credit_limit"
          inputMode="decimal"
          placeholder="0,00"
          autoComplete="off"
          defaultValue={card && card.credit_limit > 0 ? centsToInput(card.credit_limit) : ""}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Dia do fechamento" htmlFor="cc-closing" error={fieldError("closing_day")}>
          <Input
            id="cc-closing"
            name="closing_day"
            type="number"
            min={1}
            max={31}
            inputMode="numeric"
            placeholder="Ex.: 28"
            value={closing}
            onChange={(e) => setClosing(e.target.value)}
          />
        </Field>
        <Field label="Dia do vencimento" htmlFor="cc-due" error={fieldError("due_day")}>
          <Input
            id="cc-due"
            name="due_day"
            type="number"
            min={1}
            max={31}
            inputMode="numeric"
            placeholder="Ex.: 5"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Conta que paga a fatura" htmlFor="cc-account" hint="Vem escolhida ao pagar. Dá para trocar na hora.">
        <NativeSelect id="cc-account" name="default_account_id" defaultValue={card?.default_account_id ?? accounts[0]?.id ?? ""}>
          <option value="">Escolher na hora</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {!card && <OpeningFields dueLabel={dueLabel} fieldError={fieldError} />}
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
