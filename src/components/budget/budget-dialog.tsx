"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { monthLabel } from "@/lib/dates";
import { centsToInput, formatBRL } from "@/lib/money";
import { useServerForm } from "@/lib/use-server-form";
import { saveBudgetAction } from "@/server/budgets";

type Props = {
  /** mês a partir do qual o limite vale ("YYYY-MM") */
  month: string;
  categories: { id: string; name: string }[];
  /** categoria -> limite atual */
  limits: Record<string, number>;
  /** categoria -> gasto médio dos últimos meses */
  averages: Record<string, number>;
  /** editar o limite desta categoria (sem escolher outra) */
  categoryId?: string;
  categoryName?: string;
};

/** Definir, trocar ou tirar o limite de uma categoria (RN-12). */
export function BudgetDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const editing = Boolean(props.categoryId);
  return (
    <>
      {editing ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Mudar o limite de ${props.categoryName}`}
          className="text-muted-foreground"
          onClick={() => setOpen(true)}
        >
          <PencilIcon />
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <PlusIcon /> Definir limite
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editing ? `Limite de ${props.categoryName}` : "Definir um limite"}</DialogTitle>
            <DialogDescription>
              Vale para {monthLabel(props.month)} e para os meses seguintes, até você mudar. O aviso chega em 80% e em
              100% do limite.
            </DialogDescription>
          </DialogHeader>
          <BudgetForm {...props} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function BudgetForm({ month, categories, limits, averages, categoryId, onDone }: Props & { onDone: () => void }) {
  // sugere primeiro uma categoria ainda sem limite
  const [selected, setSelected] = useState(
    categoryId ?? categories.find((c) => !(c.id in limits))?.id ?? categories[0]?.id ?? "",
  );
  const { pending, onSubmit, fieldError, formError } = useServerForm(saveBudgetAction, (result) => {
    toast.success(result.message ?? "Limite salvo");
    onDone();
  });

  const current = limits[selected];
  const average = averages[selected];

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      <input type="hidden" name="month" value={month} />
      {categoryId ? (
        <input type="hidden" name="category_id" value={categoryId} />
      ) : (
        <Field label="Categoria" htmlFor="bd-category" error={fieldError("category_id")}>
          <NativeSelect id="bd-category" name="category_id" value={selected} onChange={(e) => setSelected(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.id in limits ? " (já tem limite)" : ""}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
      <Field
        label="Limite por mês (R$)"
        htmlFor="bd-amount"
        error={fieldError("amount")}
        hint={
          average
            ? `Nos últimos meses você gastou em média ${formatBRL(average)} por mês aqui.`
            : "Ainda sem gasto recente nesta categoria."
        }
      >
        <Input
          key={selected}
          id="bd-amount"
          name="amount"
          inputMode="decimal"
          placeholder="0,00"
          autoComplete="off"
          autoFocus
          defaultValue={current ? centsToInput(current) : ""}
          aria-invalid={Boolean(fieldError("amount"))}
        />
      </Field>
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar limite"}
        </Button>
        {current ? (
          <Button type="submit" name="remove" value="1" variant="ghost" disabled={pending}>
            Tirar limite
          </Button>
        ) : null}
      </div>
    </form>
  );
}
