import { IconChip } from "@/components/app/icon-chip";
import { formatDayMonth } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { transactionIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/database";

/**
 * Uma movimentação em formato de lista: ícone da categoria, descrição, detalhes
 * e valor à direita. `actions` aparece depois do valor (editar/excluir).
 */
export function TransactionItem({
  transaction: t,
  accountName,
  toAccountName,
  categoryName,
  showDate = true,
  actions,
  className,
}: {
  transaction: Pick<
    Transaction,
    "id" | "type" | "amount" | "date" | "status" | "description"
  >;
  accountName?: string;
  toAccountName?: string;
  categoryName?: string | null;
  showDate?: boolean;
  actions?: React.ReactNode;
  className?: string;
}) {
  const Icon = transactionIcon(t.type, categoryName);
  const title =
    t.description ??
    (t.type === "income" ? "Receita" : t.type === "expense" ? "Despesa" : "Transferência");

  const meta = [
    showDate ? formatDayMonth(t.date) : null,
    t.type === "transfer"
      ? `${accountName ?? "Conta"} → ${toAccountName ?? "Conta"}`
      : (categoryName ?? "Sem categoria"),
    t.type !== "transfer" && accountName ? accountName : null,
  ].filter(Boolean);

  return (
    <li className={cn("group/tx flex items-center gap-3.5 py-3", className)}>
      <IconChip
        icon={Icon}
        tone={t.type === "income" ? "sage" : "neutral"}
        className="size-11 rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {meta.join(" · ")}
          {t.status === "pending" && (
            <span className="ml-1.5 rounded-full border border-border px-1.5 py-px text-[0.625rem] tracking-wide">
              agendada
            </span>
          )}
        </p>
      </div>
      <p
        className={cn(
          "shrink-0 text-[0.9375rem] font-medium tabular-nums",
          t.type === "income" && "text-money-in",
          t.type === "transfer" && "text-muted-foreground",
        )}
      >
        {t.type === "income" ? "+ " : t.type === "expense" ? "− " : "⇄ "}
        {formatBRL(t.amount)}
      </p>
      {actions}
    </li>
  );
}
