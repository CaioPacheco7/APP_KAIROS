"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { centsToInput } from "@/lib/money";
import { useServerForm } from "@/lib/use-server-form";
import { createGoalAction } from "@/server/goals";

/** Salva o cenário escolhido como plano acompanhável. */
export function SavePlanForm({
  kind,
  defaultTitle,
  target,
  monthly,
  months,
  ratePct,
  saved = 0,
}: {
  kind: "purchase" | "debt";
  defaultTitle: string;
  /** centavos: objetivo (meta) ou total a pagar (dívida) */
  target: number;
  /** centavos: aporte mensal ou parcela */
  monthly: number;
  months: number | null;
  ratePct: string;
  saved?: number;
}) {
  const router = useRouter();
  const { pending, onSubmit, fieldError, formError } = useServerForm(
    createGoalAction,
    () => {
      toast.success("Plano salvo! Acompanhe em Planejar.");
      router.push("/planejar");
    },
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-2 border-t border-border pt-3">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="target" value={centsToInput(target)} />
      <input type="hidden" name="monthly" value={centsToInput(monthly)} />
      <input type="hidden" name="months" value={months ?? ""} />
      <input type="hidden" name="rate" value={ratePct} />
      <input type="hidden" name="saved" value={centsToInput(saved)} />
      <div className="flex gap-2">
        <Input
          name="title"
          defaultValue={defaultTitle}
          aria-label="Nome do plano"
          placeholder="Nome do plano"
          maxLength={80}
          autoComplete="off"
          aria-invalid={Boolean(fieldError("title"))}
        />
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? "Salvando…" : "Salvar plano"}
        </Button>
      </div>
      {(fieldError("title") || formError) && (
        <p role="alert" className="text-xs text-destructive">
          {fieldError("title") ?? formError}
        </p>
      )}
    </form>
  );
}
