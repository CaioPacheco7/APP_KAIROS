"use client";

import { WalletIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { centsToInput, formatBRL } from "@/lib/money";
import { useServerForm } from "@/lib/use-server-form";
import { payInvoiceAction } from "@/server/cards";

type Props = {
  cardId: string;
  cardName: string;
  /** "YYYY-MM" */
  month: string;
  /** "fatura de dezembro" */
  invoiceLabel: string;
  remaining: number;
  accounts: { id: string; name: string }[];
  defaultAccountId: string | null;
  today: string;
  variant?: "default" | "outline";
  className?: string;
};

/**
 * Pagar a fatura (toda ou parte): sai da conta escolhida como transferência
 * para o cartão. Não conta como despesa: as compras já contaram (RN-05).
 */
export function PayInvoiceDialog(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant={props.variant ?? "default"} className={props.className} onClick={() => setOpen(true)}>
        <WalletIcon /> Pagar fatura
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>
              Pagar a {props.invoiceLabel} do {props.cardName}
            </DialogTitle>
            <DialogDescription>
              O valor sai da conta e não conta como gasto de novo: as compras já contaram no dia em que foram feitas.
            </DialogDescription>
          </DialogHeader>
          <PayForm {...props} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function PayForm({
  cardId,
  month,
  remaining,
  accounts,
  defaultAccountId,
  today,
  onDone,
}: Props & { onDone: () => void }) {
  const { pending, onSubmit, fieldError, formError } = useServerForm(payInvoiceAction, () => {
    toast.success("Pagamento registrado");
    onDone();
  });
  const fallback = accounts.find((a) => a.id === defaultAccountId)?.id ?? accounts[0]?.id ?? "";
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      <input type="hidden" name="card_id" value={cardId} />
      <input type="hidden" name="invoice_month" value={month} />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Valor (R$)"
          htmlFor="pay-amount"
          error={fieldError("amount")}
          hint={remaining > 0 ? `Falta ${formatBRL(remaining)}.` : undefined}
        >
          <Input
            id="pay-amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            defaultValue={remaining > 0 ? centsToInput(remaining) : ""}
            aria-invalid={Boolean(fieldError("amount"))}
          />
        </Field>
        <Field label="Data" htmlFor="pay-date" error={fieldError("date")}>
          <Input id="pay-date" name="date" type="date" max={today} defaultValue={today} />
        </Field>
      </div>
      <Field label="Sai da conta" htmlFor="pay-account" error={fieldError("account_id")}>
        <NativeSelect id="pay-account" name="account_id" defaultValue={fallback}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <Button type="submit" disabled={pending || accounts.length === 0}>
        {pending ? "Registrando…" : "Registrar pagamento"}
      </Button>
    </form>
  );
}
