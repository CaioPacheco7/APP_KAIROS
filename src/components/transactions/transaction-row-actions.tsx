"use client";

import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { ConfirmButton } from "@/components/confirm-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteTransactionAction } from "@/server/transactions";
import type { Transaction } from "@/types/database";
import {
  TransactionDialog,
  type AccountOption,
  type CardOption,
  type CategoryOption,
} from "./transaction-dialog";

/** Editar e excluir: aparecem ao passar o mouse (no celular ficam sempre visíveis). */
export function TransactionRowActions({
  transaction,
  accounts,
  categories,
  cards,
  today,
}: {
  transaction: Transaction;
  accounts: AccountOption[];
  categories: CategoryOption[];
  cards?: CardOption[];
  today: string;
}) {
  const isPayment = transaction.type === "transfer" && Boolean(transaction.card_id);
  return (
    <div className="flex shrink-0 items-center transition-opacity md:opacity-0 md:group-focus-within/tx:opacity-100 md:group-hover/tx:opacity-100">
      {/* pagamento de fatura não se edita: exclui e paga de novo */}
      {!isPayment && (
        <TransactionDialog
          transaction={transaction}
          accounts={accounts}
          categories={categories}
          cards={cards}
          today={today}
        />
      )}
      {transaction.installment_group_id ? (
        <DeleteInstallment transaction={transaction} />
      ) : (
        <form action={deleteTransactionAction}>
          <input type="hidden" name="id" value={transaction.id} />
          <ConfirmButton
            message={
              isPayment
                ? "Excluir este pagamento? A fatura volta a ficar em aberto e o valor volta para a conta."
                : "Excluir esta transação? O saldo será recalculado."
            }
            variant="ghost"
            size="icon-sm"
            aria-label={isPayment ? "Excluir pagamento" : "Excluir transação"}
            className="text-muted-foreground"
          >
            <Trash2Icon />
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}

/** Excluir uma parcela: só esta, esta e as próximas, ou a compra toda (RN-09). */
function DeleteInstallment({ transaction }: { transaction: Transaction }) {
  const [open, setOpen] = useState(false);
  const n = transaction.installment_number ?? 1;
  const total = transaction.installment_total ?? 1;
  const choices = [
    { scope: "one", label: "Só esta parcela" },
    ...(n < total ? [{ scope: "next", label: `Esta e as próximas (${total - n + 1} parcelas)` }] : []),
    { scope: "all", label: `A compra toda (${total} parcelas)` },
  ];
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Excluir parcela"
        className="text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Trash2Icon />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Excluir parcela {n} de {total}</DialogTitle>
            <DialogDescription>
              {transaction.description ?? "Compra no cartão"}. O que você quer excluir?
            </DialogDescription>
          </DialogHeader>
          <form
            action={async (formData) => {
              await deleteTransactionAction(formData);
              setOpen(false);
            }}
            className="grid gap-2"
          >
            <input type="hidden" name="id" value={transaction.id} />
            {choices.map((c) => (
              <Button key={c.scope} type="submit" name="scope" value={c.scope} variant={c.scope === "all" ? "destructive" : "outline"}>
                {c.label}
              </Button>
            ))}
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
