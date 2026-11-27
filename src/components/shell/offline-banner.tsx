"use client";

import { WifiOffIcon } from "lucide-react";
import { useOffline } from "next/offline";

/**
 * Aviso de "sem internet" (celular com sinal fraco). O Next repete sozinho a
 * navegação e os registros que falharam assim que a conexão volta.
 */
export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-3 top-[calc(8px+env(safe-area-inset-top))] z-[60] mx-auto flex max-w-md items-center gap-2.5 rounded-full border border-rim bg-popover px-4 py-2.5 text-[0.8125rem] font-semibold text-popover-foreground shadow-pop"
    >
      <WifiOffIcon className="size-4 shrink-0 text-warn" aria-hidden />
      <span>Sem internet. Quando a conexão voltar, eu continuo de onde parou.</span>
    </div>
  );
}
