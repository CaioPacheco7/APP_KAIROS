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
import { saveAccountAction } from "@/server/accounts";
import { ACCOUNT_TYPE_LABEL, type AccountType } from "@/types/database";

type AccountValues = {
  id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
};

export function AccountDialog({ account }: { account?: AccountValues }) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(account);

  return (
    <>
      {editing ? (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Editar ${account!.name}`}
          className="text-muted-foreground"
          onClick={() => setOpen(true)}
        >
          <PencilIcon /> Editar
        </Button>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          <PlusIcon /> Nova conta
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar conta" : "Nova conta"}</DialogTitle>
            <DialogDescription>
              O saldo inicial é quanto você tem nela hoje. O saldo atual é
              calculado a partir dele e das transações.
            </DialogDescription>
          </DialogHeader>
          <AccountForm account={account} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function AccountForm({
  account,
  onDone,
}: {
  account?: AccountValues;
  onDone: () => void;
}) {
  const { pending, onSubmit, fieldError, formError } = useServerForm(
    saveAccountAction,
    () => {
      toast.success(account ? "Conta atualizada" : "Conta criada");
      onDone();
    },
  );

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      {account && <input type="hidden" name="id" value={account.id} />}

      <Field label="Nome" htmlFor="acc-name" error={fieldError("name")}>
        <Input
          id="acc-name"
          name="name"
          placeholder="Ex.: Nubank, Carteira"
          autoComplete="off"
          autoFocus
          defaultValue={account?.name ?? ""}
          aria-invalid={Boolean(fieldError("name"))}
        />
      </Field>

      <Field label="Tipo" htmlFor="acc-type" error={fieldError("type")}>
        <NativeSelect
          id="acc-type"
          name="type"
          defaultValue={account?.type ?? "checking"}
        >
          {(Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[]).map((t) => (
            <option key={t} value={t}>
              {ACCOUNT_TYPE_LABEL[t]}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field
        label="Saldo inicial (R$)"
        htmlFor="acc-balance"
        error={fieldError("initial_balance")}
        hint="Pode ser negativo (ex.: cheque especial)."
      >
        <Input
          id="acc-balance"
          name="initial_balance"
          inputMode="decimal"
          placeholder="0,00"
          autoComplete="off"
          defaultValue={account ? centsToInput(account.initial_balance) : ""}
        />
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
