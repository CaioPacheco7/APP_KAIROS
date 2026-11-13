"use client";

import { useEffect, useRef } from "react";

/** Mantém a conversa rolada até a última mensagem. */
export function ScrollToBottom({ dependency }: { dependency: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, [dependency]);
  return <div ref={ref} aria-hidden />;
}
