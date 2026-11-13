import { cache } from "react";
import { todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type {
  Account,
  AccountBalance,
  Category,
} from "@/types/database";

/** Contas ativas (não arquivadas, não excluídas), da mais antiga para a mais nova. */
export const getAccounts = cache(async (): Promise<Account[]> => {
  const db = await createClient();
  const { data } = await db
    .from("accounts")
    .select("id, name, type, initial_balance, color, archived_at")
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  return (data ?? []) as Account[];
});

export const getCategories = cache(async (): Promise<Category[]> => {
  const db = await createClient();
  const { data } = await db
    .from("categories")
    .select("id, name, type, parent_id, archived_at")
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("name", { ascending: true });
  return (data ?? []) as Category[];
});

/** account_id -> saldo atual em centavos (RN-02: calculado pela view). */
export const getBalances = cache(async (): Promise<Map<string, number>> => {
  const db = await createClient();
  const { data } = await db
    .from("v_account_balances")
    .select("account_id, balance");
  return new Map(
    ((data ?? []) as AccountBalance[]).map((r) => [r.account_id, Number(r.balance)]),
  );
});

/** Tudo que os formulários de transação precisam. */
export const getFormOptions = cache(async () => {
  const [accounts, categories] = await Promise.all([
    getAccounts(),
    getCategories(),
  ]);
  return { accounts, categories, today: todayISO() };
});

/** id -> nome de TODAS as contas (inclusive arquivadas), para exibir o histórico. */
export const getAccountNames = cache(async (): Promise<Map<string, string>> => {
  const db = await createClient();
  const { data } = await db.from("accounts").select("id, name");
  return new Map(((data ?? []) as { id: string; name: string }[]).map((a) => [a.id, a.name]));
});

/** id -> nome de TODAS as categorias (inclusive arquivadas). */
export const getCategoryNames = cache(async (): Promise<Map<string, string>> => {
  const db = await createClient();
  const { data } = await db.from("categories").select("id, name");
  return new Map(((data ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]));
});
