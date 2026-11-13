"use client";

import { ConfirmButton } from "@/components/confirm-button";
import { deleteTransactionAction } from "@/server/transactions";
import type { Transaction } from "@/types/database";
import {
  TransactionDialog,
  type AccountOption,
  type CategoryOption,
} from "./transaction-dialog";

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
    <div className="flex items-center justify-end">
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
          size="sm"
        >
          Excluir
        </ConfirmButton>
      </form>
    </div>
  );
}
