"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useRef } from "react";
import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

export type CountFormat = "brl" | "brl-signed" | "int" | "percent";

const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function formatCount(value: number, format: CountFormat): string {
  switch (format) {
    case "brl":
      return formatBRL(Math.round(value));
    case "brl-signed": {
      const v = Math.round(value);
      return `${v > 0 ? "+ " : v < 0 ? "− " : ""}${formatBRL(Math.abs(v))}`;
    }
    case "percent":
      return `${integer.format(Math.round(value))}%`;
    default:
      return integer.format(Math.round(value));
  }
}

/** Troca o texto mexendo no próprio nó que o React criou (sem substituí-lo). */
function setText(el: HTMLElement, text: string) {
  const node = el.firstChild;
  if (node && node.nodeType === Node.TEXT_NODE) node.nodeValue = text;
  else el.textContent = text;
}

// Na primeira carga, o HTML já chega com o valor final. Só vale animar desde o
// zero se a página ficou interativa rápido (senão o número "piscaria" para 0).
// Depois disso (navegação dentro do app) sempre anima.
let initialCommitDone = false;
function startFromZero(): boolean {
  if (initialCommitDone) return true;
  return typeof performance !== "undefined" && performance.now() < 1400;
}

/**
 * Número que conta até o valor (e desliza entre valores quando muda, ex.: ao
 * trocar o mês). O texto final está sempre no HTML e para leitores de tela.
 */
export function Count({
  value,
  format = "brl",
  className,
}: {
  value: number;
  format?: CountFormat;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef<number | null>(null);
  const tween = useRef<gsap.core.Tween | null>(null);
  const finalText = formatCount(value, format);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const from = shown.current ?? (startFromZero() ? 0 : value);
      window.setTimeout(() => {
        initialCommitDone = true;
      }, 0);

      tween.current?.kill();
      if (reduce || from === value) {
        shown.current = value;
        setText(el, formatCount(value, format));
        return;
      }
      const state = { v: from };
      setText(el, formatCount(from, format));
      tween.current = gsap.to(state, {
        v: value,
        duration: 0.8,
        ease: "power3.out",
        onUpdate: () => {
          shown.current = state.v;
          setText(el, formatCount(state.v, format));
        },
        onComplete: () => {
          shown.current = value;
          setText(el, formatCount(value, format));
        },
      });
      return () => tween.current?.kill();
    },
    { dependencies: [value, format] },
  );

  return (
    <span className={cn(format.startsWith("brl") && "money", className)}>
      <span ref={ref} aria-hidden>
        {finalText}
      </span>
      <span className="sr-only">{finalText}</span>
    </span>
  );
}
