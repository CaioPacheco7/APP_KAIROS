"use client";

import { ReceiptTextIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useServerForm } from "@/lib/use-server-form";
import { addOpeningBalanceAction } from "@/server/cards";
import { OpeningFields } from "./opening-fields";

/** "Informar fatura atual": para quem começou a usar o app com o cartão já em uso. */
export function OpeningDialog({ cardId, cardName, dueLabel }: { cardId: string; cardName: string; dueLabel: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setOpen(true)}>
        <ReceiptTextIcon /> Informar fatura atual
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Fatura atual do {cardName}</DialogTitle>
            <DialogDescription>
              Para começar com a fatura certa: o que já tem nela e parcelas antigas. Conta como gasto já feito, não como
              gasto de hoje.
            </DialogDescription>
          </DialogHeader>
          <OpeningForm cardId={cardId} dueLabel={dueLabel} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function OpeningForm({ cardId, dueLabel, onDone }: { cardId: string; dueLabel: string; onDone: () => void }) {
  const { pending, onSubmit, fieldError, formError } = useServerForm(addOpeningBalanceAction, (result) => {
    toast.success(result.message ?? "Fatura atual informada");
    onDone();
  });
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      <input type="hidden" name="card_id" value={cardId} />
      <OpeningFields dueLabel={dueLabel} fieldError={fieldError} />
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
