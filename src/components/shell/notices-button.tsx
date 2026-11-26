"use client";

import {
  ArrowRightIcon,
  BellIcon,
  BellRingIcon,
  CircleAlertIcon,
  ClockIcon,
  ReceiptTextIcon,
  ListTodoIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Notice } from "@/lib/notices";
import { cn } from "@/lib/utils";
import { iconButtonClass } from "./styles";

const KIND_ICON = { task: ListTodoIcon, reminder: BellRingIcon, bill: ReceiptTextIcon } as const;

/** Sino do topo: um ponto coral quando há algo atrasado ou para hoje. */
export function NoticesButton({ items }: { items: Notice[] }) {
  const [open, setOpen] = useState(false);
  // O ponto some depois que a pessoa abre a lista (volta se surgir algo novo).
  const signature = items.map((i) => i.id).join(",");
  const [seen, setSeen] = useState("");
  const urgent = items.filter((i) => i.state === "overdue" || i.state === "today").length;
  const showDot = items.length > 0 && seen !== signature;

  const label = items.length === 0 ? "Avisos: nada pendente" : `Avisos: ${items.length} ${items.length === 1 ? "item" : "itens"}`;

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        className={cn(iconButtonClass, "bg-raised")}
        onClick={() => {
          setSeen(signature);
          setOpen(true);
        }}
      >
        <BellIcon aria-hidden />
        {showDot && (
          <i aria-hidden className="absolute top-[9px] right-[9px] size-1.5 rounded-full bg-risk shadow-[0_0_0_2px_var(--glass-surface)]" />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-4 p-[18px] sm:max-w-[485px]">
          <div>
            <DialogTitle>O que precisa de você</DialogTitle>
            <DialogDescription className="mt-1">
              {items.length === 0
                ? "Nada atrasado, nada vencendo. Tudo em ordem."
                : urgent > 0
                  ? `${urgent} ${urgent === 1 ? "item atrasado ou para hoje" : "itens atrasados ou para hoje"}.`
                  : "Nada atrasado. Só o que vence nos próximos dias."}
            </DialogDescription>
          </div>
          {items.length > 0 && (
            <ul className="grid gap-1.5">
              {items.map((item) => {
                const Icon = KIND_ICON[item.kind];
                const overdue = item.state === "overdue";
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="glass-inner flex items-center gap-2.5 rounded-[12px] p-2.5 transition-colors outline-none hover:bg-raised focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-[10px]",
                          overdue
                            ? "bg-[color-mix(in_oklab,var(--status-critical)_13%,transparent)] text-risk"
                            : "bg-[color-mix(in_oklab,var(--status-warning)_14%,transparent)] text-warn",
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-[0.8125rem]">{item.title}</strong>
                        <small className="flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
                          {overdue ? (
                            <CircleAlertIcon className="size-3 text-risk" aria-hidden />
                          ) : (
                            <ClockIcon className="size-3" aria-hidden />
                          )}
                          {item.detail}
                        </small>
                      </span>
                      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
