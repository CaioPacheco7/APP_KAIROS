"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useId, useRef, useState } from "react";
import { formatBRL } from "@/lib/money";
import { capitalize, cn } from "@/lib/utils";
import { niceScale, smoothPath, tickLabel, type Point } from "@/lib/viz";
import { ChartTable, Legend } from "./metric";

gsap.registerPlugin(useGSAP);

export type FlowPoint = {
  key: string; // "2026-11"
  label: string; // "nov"
  fullLabel: string; // "novembro de 2026"
  income: number; // centavos
  expense: number; // centavos
};

const W = 600;
const H = 200;

/**
 * Entradas × saídas ao longo dos meses: duas linhas de 2px, um véu de 10% sob
 * as entradas, grade em linhas finas e contínuas. Passe o mouse (ou use o
 * teclado) para ver os dois valores do mês; a tabela traz tudo também.
 */
export function FlowChart({ points }: { points: FlowPoint[] }) {
  const fillId = `flow-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const prevPaths = useRef<{ area: string; inc: string; exp: string } | null>(null);

  const n = points.length;
  const empty = points.every((p) => p.income === 0 && p.expense === 0);
  const scale = niceScale(Math.max(0, ...points.map((p) => Math.max(p.income, p.expense))));
  const x = (i: number) => ((i + 0.5) / n) * W;
  const y = (v: number) => H - (v / scale.max) * H;
  const incPts: Point[] = points.map((p, i) => [x(i), y(p.income)]);
  const expPts: Point[] = points.map((p, i) => [x(i), y(p.expense)]);
  const inc = smoothPath(incPts);
  const exp = smoothPath(expPts);
  const area = `${inc} L ${x(n - 1)} ${H} L ${x(0)} ${H} Z`;

  // Ao trocar de mês, as linhas deslizam da forma antiga para a nova.
  useGSAP(
    () => {
      const svg = svgRef.current;
      const prev = prevPaths.current;
      prevPaths.current = { area, inc, exp };
      if (!svg || !prev || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const targets: Array<[string, string, string]> = [
        ["[data-path=area]", prev.area, area],
        ["[data-path=inc]", prev.inc, inc],
        ["[data-path=exp]", prev.exp, exp],
      ];
      for (const [sel, from, to] of targets) {
        if (from === to) continue;
        gsap.fromTo(svg.querySelector(sel), { attr: { d: from } }, { attr: { d: to }, duration: 0.6, ease: "power2.out" });
      }
    },
    { dependencies: [area, inc, exp], scope: svgRef },
  );

  if (empty) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Sem movimentação nos últimos meses.</p>;
  }

  const pct = (i: number) => `${((i + 0.5) / n) * 100}%`;
  const top = (v: number) => `${(1 - v / scale.max) * 100}%`;
  const a = active === null ? null : points[active];

  return (
    <figure className="grid min-w-0 grid-cols-1 gap-2" aria-label="Entradas e saídas por mês">
      <div className="flex min-h-5 flex-wrap items-center justify-between gap-2">
        <Legend
          items={[
            { label: "Entradas", color: "var(--series-in)", shape: "line" },
            { label: "Saídas", color: "var(--series-out)", shape: "line" },
          ]}
        />
      </div>

      <div className="grid grid-cols-[44px_minmax(0,1fr)]">
        {/* eixo Y: marcas redondas, por extenso abaixo de 10 mil */}
        <div className="relative h-[200px] text-[0.625rem] text-muted-foreground tabular-nums" aria-hidden>
          {scale.ticks.map((t) => (
            <span key={t} className="money absolute right-2 -translate-y-1/2" style={{ top: top(t) }}>
              {tickLabel(t, scale.max)}
            </span>
          ))}
        </div>

        <div className="relative h-[200px] min-w-0" onMouseLeave={() => setActive(null)}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
            aria-hidden
          >
            <defs>
              <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--series-in)" stopOpacity="0.1" />
                <stop offset="1" stopColor="var(--series-in)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {scale.ticks.map((t) => (
              <line
                key={t}
                x1="0"
                x2={W}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <g className="animate-reveal-x">
              <path data-path="area" d={area} fill={`url(#${fillId})`} />
              <path data-path="inc" d={inc} fill="none" stroke="var(--series-in)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <path data-path="exp" d={exp} fill="none" stroke="var(--series-out)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </g>
            {active !== null && (
              <line x1={x(active)} x2={x(active)} y1="0" y2={H} stroke="var(--viz-axis)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            )}
          </svg>

          {/* marcadores (HTML para continuarem redondos): fim das linhas e mês ativo */}
          {[n - 1, active].filter((i): i is number => i !== null).map((i, k) => (
            <span key={`${i}-${k}`} aria-hidden>
              <Dot left={pct(i)} top={top(points[i].income)} color="var(--series-in)" />
              <Dot left={pct(i)} top={top(points[i].expense)} color="var(--series-out)" />
            </span>
          ))}

          {/* áreas de toque/foco, uma por mês (maiores que a marca) */}
          <div className="absolute inset-0 flex">
            {points.map((p, i) => (
              <button
                key={p.key}
                type="button"
                aria-label={`${p.fullLabel}: entradas ${formatBRL(p.income)}, saídas ${formatBRL(p.expense)}`}
                aria-pressed={active === i}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(i)}
                className="h-full min-w-0 flex-1 rounded-[6px] outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              />
            ))}
          </div>

          {a && active !== null && (
            <div
              aria-hidden
              className="pointer-events-none absolute top-1.5 z-10 grid min-w-[150px] -translate-x-1/2 gap-1 rounded-[10px] border border-rim bg-surface px-2.5 py-2 text-[0.6875rem] shadow-[0_4px_12px_rgb(var(--glass-shadow)/18%)]"
              style={{ left: `clamp(80px, ${pct(active)}, calc(100% - 80px))` }}
            >
              <strong className="font-bold">{capitalize(a.fullLabel)}</strong>
              <TipRow color="var(--series-in)" value={formatBRL(a.income)} label="Entradas" />
              <TipRow color="var(--series-out)" value={formatBRL(a.expense)} label="Saídas" />
            </div>
          )}
        </div>
      </div>

      <div className="ml-[44px] flex text-[0.625rem] text-muted-foreground" aria-hidden>
        {points.map((p, i) => (
          <span key={p.key} className={cn("min-w-0 flex-1 text-center", i === n - 1 && "font-bold text-foreground")}>
            {p.label}
          </span>
        ))}
      </div>

      <ChartTable
        caption="Entradas e saídas por mês"
        columns={["Mês", "Entradas", "Saídas"]}
        rows={points.map((p) => [p.fullLabel, formatBRL(p.income), formatBRL(p.expense)])}
      />
    </figure>
  );
}

function Dot({ left, top, color }: { left: string; top: string; color: string }) {
  return (
    <span
      className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_2px_var(--glass-surface)]"
      style={{ left, top, background: color }}
    />
  );
}

function TipRow({ color, value, label }: { color: string; value: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="h-[2px] w-2.5 rounded-full" style={{ background: color }} />
      <b className="money font-extrabold tabular-nums">{value}</b>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
