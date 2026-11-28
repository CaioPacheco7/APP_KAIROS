"use client";

import { useEffect } from "react";
import { registration } from "@/lib/push-client";

/** Registra o service worker (notificações). Não guarda nada em cache. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    void registration();
  }, []);
  return null;
}
