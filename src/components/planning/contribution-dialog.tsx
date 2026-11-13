"use client";

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
import { addContributionAction } from "@/server/goals";

type Props = {
  goal: { id: string; title: string; kind: "purchase" | "debt"; monthly: number };
  accounts: { id: string; name: string }[];
  today: string;
};

/** "Registrar aporte" (meta) ou "Registrar pagamento" (dívida). */
export function ContributionDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const isDebt = props.goal.kind === "debt";

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {isDebt ? "Registrar pagamento" : "Registrar aporte"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isDebt ? "Pagamento" : "Aporte"} · {props.goal.title}
            </DialogTitle>
            <DialogDescription>
              {isDebt
                ? "Cada pagamento reduz o que falta quitar."
                : "Quanto você guardou para esta meta."}
            </DialogDescription>
          </DialogHeader>
          <ContributionForm {...props} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function ContributionForm({ goal, accounts, today, onDone }: Props & { onDone: () => void }) {
  const isDebt = goal.kind === "debt";
  const { pending, onSubmit, fieldError, formError } = useServerForm(
    addContributionAction,
    () => {
      toast.success(isDebt ? "Pagamento registrado" : "Aporte registrado");
      onDone();
    },
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input type="hidden" name="goal_id" value={goal.id} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)" htmlFor="ct-amount" error={fieldError("amount")}>
          <Input
            id="ct-amount"
            name="amount"
            inputMode="decimal"
            placeholder="0,00"
            autoComplete="off"
            autoFocus
            defaultValue={centsToInput(goal.monthly)}
          />
        </Field>
        <Field label="Data" htmlFor="ct-date" error={fieldError("date")}>
          <Input id="ct-date" name="date" type="date" defaultValue={today} className="[color-scheme:dark]" />
        </Field>
      </div>

      {isDebt && accounts.length > 0 && (
        <>
          <Field label="Saiu de qual conta?" htmlFor="ct-account">
            <NativeSelect id="ct-account" name="account_id" defaultValue={accounts[0].id}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="also_expense" defaultChecked className="size-4 accent-[var(--primary)]" />
            Lançar também como despesa nessa conta
          </label>
        </>
      )}

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Registrar"}
      </Button>
    </form>
  );
}
