"use client";

import { useState } from "react";
import { WEEKDAY_SHORT, isoWeekday } from "@/lib/habits";
import type { DayTotal } from "@/lib/routine";
import { cn } from "@/lib/utils";
import { ChartTable } from "./metric";

const dayLabel = (iso: string) => WEEKDAY_SHORT[isoWeekday(iso) - 1];
const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/**
 * Hábitos feitos em cada um dos últimos dias: um medidor vertical por dia
 * (trilho = previstos, dourado = feitos). Uma série só, então sem legenda; o
 * título diz o que é. Cada dia é focável e mostra "3 de 5".
 */
export function HabitWeek({ totals, today }: { totals: DayTotal[]; today: string }) {
  const [active, setActive] = useState<number | null>(null);
  const a = active === null ? null : totals[active];

  return (
    <figure className="grid min-w-0 grid-cols-1 gap-2" aria-label="Hábitos feitos por dia, últimos 7 dias">
      <p className="min-h-4 text-[0.6875rem] font-extrabold tabular-nums" aria-hidden>
        {a ? `${dayLabel(a.date)} ${dayMonth(a.date)} · ${a.done} de ${a.scheduled}` : " "}
      </p>
      <div className="grid h-[118px] gap-1.5" style={{ gridTemplateColumns: `repeat(${totals.length}, minmax(0, 1fr))` }} onMouseLeave={() => setActive(null)}>
        {totals.map((d, i) => {
          const ratio = d.scheduled > 0 ? d.done / d.scheduled : 0;
          return (
            <button
              key={d.date}
              type="button"
              aria-label={`${dayLabel(d.date)}, ${dayMonth(d.date)}: ${d.done} de ${d.scheduled} hábitos`}
              aria-pressed={active === i}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(i)}
              className={cn(
                "flex min-w-0 flex-col items-center justify-end gap-1.5 rounded-[8px] pt-1 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                active === i && "bg-inner",
              )}
            >
              <span aria-hidden className="relative flex w-[min(60%,22px)] flex-1 items-end overflow-hidden rounded-t-[4px] rounded-b-[2px] bg-gold-soft">
                <span
                  className="animate-grow-y block w-full rounded-t-[4px] bg-(--series-habit) transition-[height] duration-500"
                  style={{ height: `${ratio * 100}%`, ["--d" as string]: `${160 + i * 40}ms` }}
                />
              </span>
              <span aria-hidden className={cn("text-[0.6875rem] sm:text-[0.625rem] text-muted-foreground", d.date === today && "font-extrabold text-foreground")}>
                {dayLabel(d.date)}
              </span>
            </button>
          );
        })}
      </div>
      <ChartTable
        caption="Hábitos feitos por dia"
        columns={["Dia", "Feitos", "Previstos"]}
        rows={totals.map((d) => [`${dayLabel(d.date)} ${dayMonth(d.date)}`, d.done, d.scheduled])}
      />
    </figure>
  );
}
