"use client";

import { usePathname } from "next/navigation";
import { isFinancePath } from "@/lib/sections";

/** Mostra o conteúdo só dentro de Finanças (ex.: o botão "+ Novo" de transação). */
export function FinanceOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return isFinancePath(pathname) ? <>{children}</> : null;
}
