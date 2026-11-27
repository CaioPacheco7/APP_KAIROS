import type { CreditCard } from "@/types/database";
import type { CardOption } from "./transaction-dialog";

/** Cartões no formato que o formulário de transação usa (com o ciclo da fatura). */
export function cardOptions(cards: CreditCard[]): CardOption[] {
  return cards.map((c) => ({ id: c.id, name: c.name, closingDay: c.closing_day, dueDay: c.due_day }));
}
