"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FINANCE_SUBNAV, isFinancePath } from "@/lib/sections";
import { cn } from "@/lib/utils";

const MAIN = [
  { href: "/", label: "Início", active: (p: string) => p === "/" },
  { href: "/financas", label: "Finanças", active: isFinancePath },
  { href: "/rotina", label: "Rotina", active: (p: string) => p.startsWith("/rotina") },
  { href: "/registrar", label: "Registrar", active: (p: string) => p.startsWith("/registrar") },
] as const;

const pill = (active: boolean) =>
  cn(
    "shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors",
    active
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

/** Navegação principal em pílula, no topo (sem menu lateral). */
export function TopNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-card/60 p-1 backdrop-blur"
    >
      {MAIN.map((item) => {
        const active = item.active(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={pill(active)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Segunda linha: aparece só dentro de Finanças. */
export function FinanceSubNav() {
  const pathname = usePathname();
  if (!isFinancePath(pathname)) return null;

  return (
    <nav
      aria-label="Finanças"
      className="order-last flex w-full gap-1 overflow-x-auto pb-1"
    >
      {FINANCE_SUBNAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1 text-sm transition-colors",
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mostra o conteúdo só dentro de Finanças (ex.: o botão "+ Novo" de transação). */
export function FinanceOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return isFinancePath(pathname) ? <>{children}</> : null;
}
