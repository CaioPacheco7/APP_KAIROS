"use client";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/**
 * Saldo de quem começa a usar o app com o cartão já em uso (RN-41): o que já
 * está na próxima fatura e parcelas de compras antigas que ainda vão cair.
 */
export function OpeningFields({
  dueLabel,
  fieldError,
}: {
  /** vencimento da próxima fatura, ex.: "05/12" (null se o ciclo ainda não foi preenchido) */
  dueLabel: string | null;
  fieldError: (name: string) => string | undefined;
}) {
  return (
    <fieldset className="glass-inner grid grid-cols-1 gap-3 rounded-[14px] p-3.5">
      <legend className="sr-only">O que já está no cartão</legend>
      <p className="text-[0.8125rem] font-bold">O que você já deve neste cartão</p>
      <Field
        label={dueLabel ? `Fatura que vence em ${dueLabel} (R$)` : "Fatura que vai vencer (R$)"}
        htmlFor="op-current"
        error={fieldError("opening_current")}
        hint="O total que o banco mostra agora. Deixe vazio se estiver zerada."
      >
        <Input id="op-current" name="opening_current" inputMode="decimal" placeholder="0,00" autoComplete="off" />
      </Field>
      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
        <Field label="Parcelas antigas (R$/mês)" htmlFor="op-per-month" error={fieldError("opening_per_month")}>
          <Input id="op-per-month" name="opening_per_month" inputMode="decimal" placeholder="0,00" autoComplete="off" />
        </Field>
        <Field label="Por mais" htmlFor="op-months" error={fieldError("opening_months")}>
          <Input id="op-months" name="opening_months" type="number" min={0} max={47} inputMode="numeric" placeholder="meses" />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        Parcelas de compras feitas antes de usar o KAIROS que ainda vão cair nas faturas seguintes. Entra no limite e nas
        próximas faturas.
      </p>
    </fieldset>
  );
}
