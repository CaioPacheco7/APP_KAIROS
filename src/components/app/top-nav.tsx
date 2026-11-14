"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Visão geral" },
  { href: "/mes", label: "Meu mês" },
  { href: "/registrar", label: "Registrar" },
  { href: "/transacoes", label: "Transações" },
  { href: "/contas", label: "Contas" },
  { href: "/rotina", label: "Rotina" },
] as const;

/** Navegação em pílula, no topo (sem menu lateral). */
export function TopNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-card/60 p-1 backdrop-blur"
    >
      {ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
