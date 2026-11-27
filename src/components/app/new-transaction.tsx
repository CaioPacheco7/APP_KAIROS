import { connection } from "next/server";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { cardOptions } from "@/components/transactions/options";
import { getFormOptions } from "@/server/queries";

/** Botão global "+ Novo" (carrega contas, cartões e categorias no servidor). */
export async function NewTransaction() {
  await connection();
  const { accounts, categories, cards, today } = await getFormOptions();

  return (
    <TransactionDialog
      accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
      cards={cardOptions(cards)}
      today={today}
    />
  );
}
