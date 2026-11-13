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
  account_id: string;
  category_id: string | null;
  transfer_account_id: string | null;
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
