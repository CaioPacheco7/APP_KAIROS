import { PlusIcon } from "lucide-react";
import { connection } from "next/server";
import { cardOptions } from "@/components/transactions/options";
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { dockPlusClass } from "./styles";
import { getFormOptions } from "@/server/queries";

/**
 * O "+" no meio da doca do celular: lança um gasto (ou receita, ou compra no
 * cartão) de qualquer tela, sem passar por Finanças. Contas, cartões e
 * categorias vêm do servidor (a mesma consulta da barra do topo, em cache).
 */
export async function QuickAdd() {
  await connection();
  const { accounts, categories, cards, today } = await getFormOptions();
  return (
    <TransactionDialog
      trigger="dock"
      accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
      cards={cardOptions(cards)}
      today={today}
    />
  );
}

/** Enquanto carrega: o mesmo botão, desligado. */
export function QuickAddPlaceholder() {
  return (
    <span aria-hidden className={`${dockPlusClass} opacity-60`}>
      <PlusIcon className="size-6" strokeWidth={2.4} />
    </span>
  );
}
