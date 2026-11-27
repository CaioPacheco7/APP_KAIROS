"use client";

import { ArrowUpRightIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { formatLongDate, todayISO } from "@/lib/dates";
import { sceneFor, type SceneId } from "@/lib/navigation";
import { capitalize } from "@/lib/utils";

const noop = () => () => {};

/** Data de hoje (só no navegador: o servidor não sabe "quando" a página é vista). */
export function TodayLabel() {
  const label = useSyncExternalStore(
    noop,
    () => formatLongDate(todayISO()),
    () => "",
  );
  return <span>{label ? capitalize(label) : " "}</span>;
}

const CREDITS: Record<SceneId, { label: string; href: string }> = {
  casa: { label: "Foto: GoodLifeConstruction · Unsplash", href: "https://unsplash.com/photos/e0oJLc5FYsg" },
  horizonte: { label: "Foto: Unsplash", href: "https://unsplash.com/license" },
  rotina: { label: "Foto: Unsplash", href: "https://unsplash.com/license" },
};

/** Rodapé discreto: lema e o crédito da foto da cena atual. */
export function ShellFooter() {
  const credit = CREDITS[sceneFor(usePathname())];
  const pill = "flex min-h-6 items-center gap-1 rounded-full bg-raised px-2.5 py-1 text-[0.6875rem] sm:text-[0.625rem] font-bold text-foreground";
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2.5 px-1 pt-8 pb-1 md:pt-9">
      <span className={pill}>KAIROS · o momento certo de decidir</span>
      <a href={credit.href} target="_blank" rel="noreferrer" className={`${pill} touch-hit hover:underline`}>
        {credit.label}
        <ArrowUpRightIcon className="size-2.5" aria-hidden />
      </a>
    </footer>
  );
}
