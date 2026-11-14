import { ALL_WEEKDAYS, WEEKDAY_SHORT } from "@/lib/habits";
import { cn } from "@/lib/utils";

/** Seleção dos dias da semana: checkboxes nativos (name="weekdays") com visual de chip. */
export function WeekdayChips({
  defaultValue = ALL_WEEKDAYS,
  idPrefix,
}: {
  defaultValue?: number[];
  idPrefix: string;
}) {
  return (
    <fieldset className="grid grid-cols-1 gap-2">
      <legend className="mb-1 text-sm font-medium">Dias da semana</legend>
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAY_SHORT.map((label, i) => {
          const value = i + 1; // ISO: 1 = segunda
          return (
            <label key={value} htmlFor={`${idPrefix}-${value}`} className="cursor-pointer">
              <input
                id={`${idPrefix}-${value}`}
                type="checkbox"
                name="weekdays"
                value={value}
                defaultChecked={defaultValue.includes(value)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "inline-flex h-9 min-w-12 items-center justify-center rounded-full border border-border bg-card px-3 text-xs font-medium transition-colors",
                  "text-muted-foreground hover:border-gold-fill/50",
                  "peer-checked:border-gold-fill peer-checked:bg-gold-soft peer-checked:text-gold",
                  "peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/40",
                )}
              >
                {label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
