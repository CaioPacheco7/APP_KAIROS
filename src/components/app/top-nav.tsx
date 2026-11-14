"use client";

import {
  HouseIcon,
  ListChecksIcon,
  SquarePenIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FINANCE_SUBNAV, isFinancePath } from "@/lib/sections";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: (pathname: string) => boolean;
};

/** Seções principais do app (a mesma lista serve ao topo e à barra do celular). */
export const MAIN_ITEMS: Item[] = [
  { href: "/", label: "Início", icon: HouseIcon, active: (p) => p === "/" },
  { href: "/financas", label: "Finanças", icon: WalletIcon, active: isFinancePath },
  { href: "/rotina", label: "Rotina", icon: ListChecksIcon, active: (p) => p.startsWith("/rotina") },
  { href: "/registrar", label: "Registrar", icon: SquarePenIcon, active: (p) => p.startsWith("/registrar") },
];

/** Navegação principal em pílula, com um indicador que desliza até a seção atual. */
export function TopNav() {
  const pathname = usePathname();
  const trackRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);

  const measure = useCallback(() => {
    const active = trackRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    setBox(active ? { left: active.offsetLeft, width: active.offsetWidth } : null);
  }, []);

  useLayoutEffect(measure, [pathname, measure]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <nav aria-label="Principal" className="max-w-full">
      <div
        ref={trackRef}
        className="relative flex gap-0.5 rounded-full border border-border bg-card/70 p-1 shadow-xs backdrop-blur"
      >
        {box && (
          <span
            aria-hidden
            className="absolute top-1 bottom-1 left-0 rounded-full bg-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_6px_14px_-8px_rgba(20,15,5,0.6)] transition-[transform,width] duration-300 ease-out"
            style={{ width: box.width, transform: `translateX(${box.left}px)` }}
          />
        )}
        {MAIN_ITEMS.map((item) => {
          const active = item.active(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative z-10 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? cn("text-primary-foreground", !box && "bg-primary")
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Segunda linha: abas de Finanças (só aparece dentro do módulo). */
export function FinanceSubNav() {
  const pathname = usePathname();
  if (!isFinancePath(pathname)) return null;

  return (
    <nav aria-label="Finanças" className="no-scrollbar order-last -mb-px w-full overflow-x-auto">
      <ul className="flex min-w-max gap-1">
        {FINANCE_SUBNAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative block px-3.5 py-3 text-sm transition-colors",
                  active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-gold-fill"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Mostra o conteúdo só dentro de Finanças (ex.: o botão "+ Novo" de transação). */
export function FinanceOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return isFinancePath(pathname) ? <>{children}</> : null;
}

/** Barra inferior para o celular (polegar alcança tudo). */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal (celular)"
      className="fixed inset-x-3 bottom-3 z-50 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-3xl border border-border bg-card/85 p-1.5 shadow-pop backdrop-blur-xl">
        {MAIN_ITEMS.map((item) => {
          const active = item.active(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl py-2 text-[0.6875rem] font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
