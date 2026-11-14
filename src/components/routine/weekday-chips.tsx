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
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">Dias da semana</legend>
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
                  "inline-flex h-8 min-w-11 items-center justify-center rounded-full border border-border px-3 text-xs transition-colors",
                  "text-muted-foreground peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground",
                  "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
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
