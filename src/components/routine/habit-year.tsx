"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChartTable } from "@/components/viz/metric";
import { monthLabel, monthShort } from "@/lib/dates";
import { yearByMonth, yearLevel, type YearDay, type YearWeek } from "@/lib/habits";
import { capitalize, cn } from "@/lib/utils";

/** Escala de um só tom (o dourado dos hábitos), do claro ao escuro. */
const LEVEL_BG = [
  "bg-track",
  "bg-[color-mix(in_oklab,var(--series-habit)_32%,transparent)]",
  "bg-[color-mix(in_oklab,var(--series-habit)_56%,transparent)]",
  "bg-[color-mix(in_oklab,var(--series-habit)_78%,transparent)]",
  "bg-(--series-habit)",
] as const;

const WEEKDAY_LABEL = ["Seg", "", "Qua", "", "Sex", "", ""];

const pct = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

const dayName = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short" })
    .format(new Date(Date.UTC(y, m - 1, d)))
    .replaceAll(".", "");
};

function describe(day: YearDay): string {
  if (day.scheduled === 0) return "nenhum hábito previsto";
  if (day.done === day.scheduled) {
    return day.scheduled === 1 ? "hábito feito" : `todos os ${day.scheduled} hábitos feitos`;
  }
  return `${day.done} de ${day.scheduled} ${day.scheduled === 1 ? "hábito feito" : "hábitos feitos"}`;
}

/** Rótulos de mês no topo: some o que ficaria encavalado no seguinte (ex.: o mês parcial da 1ª coluna). */
function monthLabels(weeks: YearWeek[]): Array<string | null> {
  const starts = weeks.map((w, i) => (w.monthStart && i < weeks.length - 1 ? i : -1)).filter((i) => i >= 0);
  const labels: Array<string | null> = weeks.map(() => null);
  starts.forEach((i, k) => {
    const next = starts[k + 1];
    if (next === undefined || next - i >= 3) labels[i] = monthShort(weeks[i].monthStart!);
  });
  return labels;
}

/**
 * Mapa do ano: um quadradinho por dia (colunas = semanas, de segunda a
 * domingo), mais escuro quanto mais hábitos previstos foram feitos.
 * Toque num dia, passe o mouse ou use as setas do teclado para ler cada dia.
 */
export function HabitYearMap({ weeks }: { weeks: YearWeek[] }) {
  const days = useMemo(() => weeks.flatMap((w) => w.days).filter((d): d is YearDay => d !== null), [weeks]);
  const lastIndex = days.length - 1;
  const [active, setActive] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // começa mostrando as semanas mais recentes (a rolagem fica dentro do painel)
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const months = useMemo(() => yearByMonth(weeks), [weeks]);
  const labels = useMemo(() => monthLabels(weeks), [weeks]);
  const totals = months.reduce(
    (acc, m) => ({ perfect: acc.perfect + m.perfectDays, scheduled: acc.scheduled + m.scheduled, done: acc.done + m.done }),
    { perfect: 0, scheduled: 0, done: 0 },
  );
  const indexOf = new Map(days.map((d, i) => [d.date, i]));
  const shown = active !== null ? days[active] : null;

  function onKeyDown(e: React.KeyboardEvent) {
    const step: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
    let next: number | null = null;
    if (e.key in step) next = (active ?? lastIndex) + step[e.key];
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = lastIndex;
    if (next === null) return;
    e.preventDefault();
    setActive(Math.max(0, Math.min(lastIndex, next)));
  }

  if (totals.scheduled === 0) {
    return <p className="py-6 text-center text-[0.8125rem] text-muted-foreground">Marque os seus hábitos e o ano vai se pintando aqui.</p>;
  }

  return (
    <figure
      className="@container m-0 grid min-w-0 gap-3"
      style={{ "--cell": `clamp(11px, calc((100cqw - 34px - ${(weeks.length - 1) * 3}px) / ${weeks.length}), 18px)` } as React.CSSProperties}
    >
      <p className="text-[0.8125rem]">
        <strong className="font-extrabold">{totals.perfect}</strong> {totals.perfect === 1 ? "dia perfeito" : "dias perfeitos"} ·{" "}
        <strong className="font-extrabold">{pct.format((totals.done / totals.scheduled) * 100)}%</strong> dos hábitos previstos feitos
      </p>

      <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-1.5">
        {/* dias da semana */}
        <div className="grid grid-rows-[14px_repeat(7,var(--cell))] gap-[3px] text-[0.6875rem] sm:text-[0.5625rem] leading-(--cell) text-muted-foreground" aria-hidden>
          <span />
          {WEEKDAY_LABEL.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>

        <div
          ref={scroller}
          tabIndex={0}
          role="group"
          aria-label="Mapa do ano dos hábitos. Use as setas para andar pelos dias."
          aria-describedby="habit-year-readout"
          onKeyDown={onKeyDown}
          onFocus={() => active === null && setActive(lastIndex)}
          onMouseLeave={() => setActive(null)}
          className="no-scrollbar min-w-0 overflow-x-auto rounded-[6px] pb-0.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <div
            className="grid w-max grid-flow-col grid-rows-[14px_repeat(7,var(--cell))] gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${weeks.length}, var(--cell))` }}
          >
            {weeks.map((week, w) => (
              <div key={w} className="contents">
                <span className="relative text-[0.6875rem] sm:text-[0.5625rem] leading-[14px] whitespace-nowrap text-muted-foreground" aria-hidden>
                  {labels[w] ?? ""}
                </span>
                {week.days.map((day, d) => {
                  if (!day) return <span key={d} aria-hidden />;
                  const level = yearLevel(day);
                  const i = indexOf.get(day.date)!;
                  return (
                    <span
                      key={d}
                      aria-hidden
                      onMouseEnter={() => setActive(i)}
                      // no celular, um toque no dia mostra a leitura
                      onClick={() => setActive(i)}
                      className={cn(
                        "size-(--cell) rounded-[3px]",
                        level === null ? "border border-line" : LEVEL_BG[level],
                        active === i && "ring-2 ring-foreground ring-offset-1 ring-offset-(--glass-surface)",
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[0.6875rem] text-muted-foreground">
        <p id="habit-year-readout" aria-live="polite" className="min-h-[1rem] font-semibold text-foreground">
          {shown ? `${capitalize(dayName(shown.date))}: ${describe(shown)}` : "Toque num dia (ou passe o mouse, ou use as setas) para ver os detalhes"}
        </p>
        <span className="flex items-center gap-1.5" aria-hidden>
          Menos
          {LEVEL_BG.map((bg) => (
            <span key={bg} className={cn("size-[11px] rounded-[3px]", bg)} />
          ))}
          Mais
          <span className="ml-2 size-[11px] rounded-[3px] border border-line" /> sem hábito previsto
        </span>
      </div>

      <ChartTable
        caption="Hábitos por mês"
        columns={["Mês", "Dias com hábito", "Dias perfeitos", "Feitos"]}
        rows={months.map((m) => [
          capitalize(monthLabel(m.month)),
          m.activeDays,
          m.perfectDays,
          `${pct.format((m.done / m.scheduled) * 100)}%`,
        ])}
      />
    </figure>
  );
}
