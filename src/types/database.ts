/**
 * Tipos das tabelas/views usadas pelo app (espelham supabase/migrations).
 * Valores monetários em CENTAVOS. Datas como string ISO.
 */

export type AccountType = "checking" | "savings" | "wallet" | "investment";
export type CategoryType = "income" | "expense";
export type TransactionType = "income" | "expense" | "transfer";
export type TransactionStatus = "pending" | "settled";

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  color: string | null;
  archived_at: string | null;
};

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  parent_id: string | null;
  archived_at: string | null;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  status: TransactionStatus;
  description: string | null;
  notes: string | null;
  /** null em compra no cartão (o dinheiro sai da conta só ao pagar a fatura) */
  account_id: string | null;
  category_id: string | null;
  transfer_account_id: string | null;
  /** compra no cartão ou pagamento de fatura */
  card_id?: string | null;
  /** mês da fatura (do vencimento): "YYYY-MM-01" */
  invoice_month?: string | null;
  installment_group_id?: string | null;
  installment_number?: number | null;
  installment_total?: number | null;
};

/** Colunas de transação que as listas buscam. */
export const TRANSACTION_COLUMNS =
  "id, type, amount, date, status, description, notes, account_id, category_id, transfer_account_id, card_id, invoice_month, installment_group_id, installment_number, installment_total";

export type CreditCard = {
  id: string;
  name: string;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  default_account_id: string | null;
  archived_at: string | null;
};

export type CardInvoiceRow = {
  card_id: string;
  invoice_month: string; // "YYYY-MM-01"
  charges: number;
  paid: number;
  items: number;
};

export type Budget = {
  category_id: string;
  month: string; // "YYYY-MM-01"
  amount: number;
};

export type AccountBalance = { account_id: string; balance: number };

export type MonthlySummary = {
  month: string; // "YYYY-MM-01"
  income_settled: number;
  expense_settled: number;
  income_pending: number;
  expense_pending: number;
};

export type SpendingByCategory = {
  month: string;
  category_id: string | null;
  total: number;
};

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  wallet: "Carteira",
  investment: "Investimento",
};

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  income: "Receita",
  expense: "Despesa",
  transfer: "Transferência",
};

export type Recurrence = {
  id: string;
  kind: "income" | "expense";
  description: string;
  amount: number;
  day_of_month: number;
  account_id: string;
  category_id: string | null;
  starts_on: string;
  active: boolean;
};

export type Profile = {
  id: string;
  name: string | null;
  onboarded_at: string | null;
  health_green_max: number;
  health_yellow_max: number;
};

export type Goal = {
  id: string;
  kind: "purchase" | "debt";
  title: string;
  target_amount: number;
  monthly_amount: number;
  months_planned: number | null;
  rate_pct_month: number;
  status: "active" | "done" | "paused";
};
