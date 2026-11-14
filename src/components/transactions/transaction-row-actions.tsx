"use client";

import { Trash2Icon } from "lucide-react";
import { ConfirmButton } from "@/components/confirm-button";
import { deleteTransactionAction } from "@/server/transactions";
import type { Transaction } from "@/types/database";
import {
  TransactionDialog,
  type AccountOption,
  type CategoryOption,
} from "./transaction-dialog";

/** Editar e excluir: aparecem ao passar o mouse (no celular ficam sempre visíveis). */
export function TransactionRowActions({
  transaction,
  accounts,
  categories,
  today,
}: {
  transaction: Transaction;
  accounts: AccountOption[];
  categories: CategoryOption[];
  today: string;
}) {
  return (
    <div className="flex shrink-0 items-center transition-opacity md:opacity-0 md:group-focus-within/tx:opacity-100 md:group-hover/tx:opacity-100">
      <TransactionDialog
        transaction={transaction}
        accounts={accounts}
        categories={categories}
        today={today}
      />
      <form action={deleteTransactionAction}>
        <input type="hidden" name="id" value={transaction.id} />
        <ConfirmButton
          message="Excluir esta transação? O saldo será recalculado."
          variant="ghost"
          size="icon-sm"
          aria-label="Excluir transação"
          className="text-muted-foreground"
        >
          <Trash2Icon />
        </ConfirmButton>
      </form>
    </div>
  );
}
