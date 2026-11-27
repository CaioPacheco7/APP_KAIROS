"use client";

import {
  ArrowLeftRightIcon,
  BellRingIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  FlagIcon,
  HouseIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  ListTodoIcon,
  NotebookPenIcon,
  SquarePenIcon,
  SunIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  MODULES,
  activeSubId,
  moduleFor,
  subnavFor,
  type ModuleId,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

const MODULE_ICON: Record<ModuleId, LucideIcon> = {
  inicio: HouseIcon,
  financas: WalletIcon,
  rotina: ListChecksIcon,
  registrar: SquarePenIcon,
};

const SUB_ICON: Record<string, LucideIcon> = {
  dashboard: LayoutDashboardIcon,
  mes: CalendarDaysIcon,
  transacoes: ArrowLeftRightIcon,
  contas: LandmarkIcon,
  cartoes: CreditCardIcon,
  planejar: FlagIcon,
  hoje: SunIcon,
  tarefas: ListTodoIcon,
  lembretes: BellRingIcon,
  notas: NotebookPenIcon,
};

type DockItem = {
  key: string;
  href: string;
  label: string;
  short: string;
  icon: LucideIcon;
  active: boolean;
};

function useModuleItems(): DockItem[] {
  const current = moduleFor(usePathname());
  return MODULES.map((m) => ({
    key: m.id,
    href: m.href,
    label: m.label,
    short: m.label,
    icon: MODULE_ICON[m.id],
    active: m.id === current,
  }));
}

function useSubItems(): DockItem[] {
  const pathname = usePathname();
  const aba = useSearchParams().get("aba");
  const current = moduleFor(pathname);
  const active = activeSubId(current, pathname, aba);
  return subnavFor(current).map((s) => ({
    key: s.id,
    href: s.href,
    label: s.label,
    short: s.short,
    icon: SUB_ICON[s.id] ?? LayoutDashboardIcon,
    active: s.id === active,
  }));
}

/** "Pílula" marfim que desliza até o item ativo. */
function useIndicator(dependency: string) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const measure = useCallback(() => {
    const active = trackRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    setBox(active ? { x: active.offsetLeft, y: active.offsetTop, w: active.offsetWidth, h: active.offsetHeight } : null);
  }, []);

  useLayoutEffect(measure, [dependency, measure]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
  }, [measure]);

  return { trackRef, box };
}

function Dock({
  items,
  label,
  orientation,
  showText,
  className,
  slot,
  slotIndex = 0,
}: {
  items: DockItem[];
  label: string;
  orientation: "row" | "column";
  /** "full" = nome inteiro · "short" = nome curto embaixo do ícone · "tip" = só ícone com dica */
  showText: "full" | "short" | "tip";
  className?: string;
  /** algo extra no meio da doca (o "+" do celular), antes do item `slotIndex` */
  slot?: React.ReactNode;
  slotIndex?: number;
}) {
  const signature = items.map((i) => `${i.key}:${i.active}`).join("|");
  const { trackRef, box } = useIndicator(signature);

  return (
    <nav aria-label={label} className={className}>
      <div
        ref={trackRef}
        className={cn(
          "glass-rail relative flex gap-[3px] rounded-full p-1",
          orientation === "column" ? "flex-col" : "flex-row",
        )}
      >
        {box && (
          <span
            aria-hidden
            className="absolute top-0 left-0 rounded-full bg-pick shadow-[inset_0_1px_0_white,0_2px_7px_rgb(var(--glass-shadow)/16%)] transition-[transform,width,height] duration-[360ms] ease-[cubic-bezier(.24,.89,.26,1)]"
            style={{ width: box.w, height: box.h, transform: `translate(${box.x}px, ${box.y}px)` }}
          />
        )}
        {items.map((item, index) => (
          <Fragment key={item.key}>
          {slot && index === slotIndex && (
            <div className="relative z-10 flex shrink-0 items-center justify-center px-0.5">{slot}</div>
          )}
          <Link
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            aria-label={showText === "tip" ? item.label : undefined}
            className={cn(
              "group/dock relative z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full font-bold whitespace-nowrap transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              showText === "full" && "gap-1.5 px-3.5 text-[0.75rem]",
              showText === "short" && "flex-1 flex-col gap-0.5 px-1.5 py-1 text-[0.6875rem] sm:text-[0.625rem] leading-tight",
              item.active
                ? cn("text-pick-ink", !box && "bg-pick")
                : "text-foreground/85 hover:bg-inner hover:text-foreground",
            )}
          >
            <item.icon className={cn("shrink-0", showText === "short" ? "size-[18px]" : "size-4")} strokeWidth={1.9} aria-hidden />
            {showText === "full" && <span>{item.label}</span>}
            {showText === "short" && <span>{item.short}</span>}
            {showText === "tip" && (
              <span
                aria-hidden
                className="pointer-events-none absolute left-[calc(100%+8px)] hidden rounded-lg border border-rim bg-surface px-2.5 py-1.5 text-xs text-foreground shadow-[0_3px_8px_rgb(var(--glass-shadow)/17%)] group-hover/dock:inline group-focus-visible/dock:inline"
              >
                {item.label}
              </span>
            )}
          </Link>
          </Fragment>
        ))}
      </div>
    </nav>
  );
}

/** Doca lateral (computador): os quatro módulos, só ícones com dica. */
export function SideDock() {
  const items = useModuleItems();
  return (
    <div className="absolute inset-y-0 -left-6 z-30 hidden md:block">
      <Dock
        items={items}
        label="Módulos"
        orientation="column"
        showText="tip"
        className="sticky top-[clamp(96px,22vh,180px)]"
      />
    </div>
  );
}

function BottomDockInner() {
  const sub = useSubItems();
  const modules = useModuleItems();
  const hasSub = sub.length > 0;
  return (
    <Dock
      items={hasSub ? sub : modules}
      label={hasSub ? "Seções do módulo" : "Módulos"}
      orientation="row"
      showText="full"
      className="fixed bottom-4 left-1/2 z-40 hidden max-w-[calc(100vw-2rem)] -translate-x-1/2 md:block"
    />
  );
}

/** Doca de baixo (computador): as abas do módulo atual (ou os módulos, no Início). */
export function BottomDock() {
  return <BottomDockInner />;
}

/**
 * Doca fixa do celular: os quatro módulos e, no meio, o "+" para lançar um
 * gasto de qualquer tela (`action`, carregado no servidor pelo layout).
 */
export function MobileDock({ action }: { action?: React.ReactNode }) {
  const items = useModuleItems();
  return (
    <Dock
      items={items}
      label="Módulos"
      orientation="row"
      showText="short"
      slot={action}
      slotIndex={2}
      className="fixed inset-x-[11px] bottom-[calc(9px+env(safe-area-inset-bottom))] z-50 md:hidden [&>div]:justify-between"
    />
  );
}

/**
 * Abas do módulo no celular: todas visíveis numa linha (ícone + nome curto),
 * sem precisar deslizar para descobrir as que ficavam fora da tela.
 */
export function SectionTabs() {
  const items = useSubItems();
  const signature = items.map((i) => `${i.key}:${i.active}`).join("|");
  const { trackRef, box } = useIndicator(signature);
  if (items.length === 0) return null;

  return (
    <nav aria-label="Seções do módulo" className="no-scrollbar -mx-1 mb-4 overflow-x-auto px-1 md:hidden">
      <div ref={trackRef} className="glass-inner relative flex min-w-full gap-0.5 rounded-[18px] p-[3px]">
        {box && (
          <span
            aria-hidden
            className="absolute top-0 left-0 rounded-[15px] bg-primary transition-[transform,width] duration-300 ease-out"
            style={{ width: box.w, height: box.h, transform: `translate(${box.x}px, ${box.y}px)` }}
          />
        )}
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "relative z-10 flex min-h-12 min-w-11 flex-auto flex-col items-center justify-center gap-0.5 rounded-[15px] px-1.5 text-[0.6875rem] leading-tight font-bold whitespace-nowrap transition-colors",
              item.active ? cn("text-primary-foreground", !box && "bg-primary") : "text-muted-foreground",
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.short}
          </Link>
        ))}
      </div>
    </nav>
  );
}
