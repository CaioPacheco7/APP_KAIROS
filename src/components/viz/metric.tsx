import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { deltaTone, formatPct } from "@/lib/viz";
import { Count, type CountFormat } from "./count";

/**
 * Variação contra um período nomeado ("vs outubro"). A cor diz se é bom ou
 * ruim (subir saídas é ruim), mas nunca sozinha: seta + texto + aviso para
 * leitores de tela.
 */
export function Delta({
  change,
  goodWhen,
  vs,
  className,
}: {
  change: number | null;
  goodWhen: "up" | "down";
  vs?: string;
  className?: string;
}) {
  // Sem base de comparação (mês anterior zerado): não inventa variação.
  if (change === null) return null;
  const tone = deltaTone(change, goodWhen);
  const Icon = tone === "neutral" ? MinusIcon : change > 0 ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span className={cn("flex flex-wrap items-center gap-1 text-[0.6875rem] font-semibold text-muted-foreground", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md px-1 py-0.5 font-extrabold",
          tone === "good" && "bg-[color-mix(in_oklab,var(--status-good)_13%,transparent)] text-good",
          tone === "bad" && "bg-[color-mix(in_oklab,var(--status-critical)_12%,transparent)] text-risk",
          tone === "neutral" && "bg-inner text-foreground",
        )}
      >
        <Icon className="size-3" strokeWidth={2.4} aria-hidden />
        {formatPct(change)}
        <span className="sr-only">{tone === "good" ? " (bom sinal)" : tone === "bad" ? " (atenção)" : " (estável)"}</span>
      </span>
      {vs && <span>{vs}</span>}
    </span>
  );
}

/**
 * Indicador (stat tile): rótulo, valor que conta até o número e uma linha de
 * apoio (variação ou nota). `highlight` = o indicador mais útil do painel,
 * em dourado champanhe.
 */
export function Metric({
  label,
  icon: Icon,
  value,
  format = "brl",
  footer,
  highlight = false,
  className,
}: {
  label: string;
  icon: LucideIcon;
  value: number;
  format?: CountFormat;
  footer?: React.ReactNode;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex min-h-[112px] min-w-0 flex-col justify-between rounded-[16px] p-3",
        highlight
          ? "border border-[#f6e3b4] bg-[radial-gradient(ellipse_at_8%_-20%,#fbe9bd,transparent_68%),linear-gradient(145deg,#e3c37f,#b98d42)] text-[#22180a] shadow-[inset_0_1px_2px_rgb(255_247_225/60%),0_6px_14px_rgb(120_84_26/22%)] [--muted-foreground:#3d2c0f]"
          : "glass-panel",
        className,
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-1 text-[0.6875rem] font-bold">
        <span className="min-w-0 truncate">{label}</span>
        <span
          aria-hidden
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-[10px]",
            highlight ? "bg-[rgb(255_250_235/30%)]" : "glass-inner",
          )}
        >
          <Icon className="size-3.5" />
        </span>
      </div>
      <strong className="mt-1 mb-1.5 block text-[clamp(1.3rem,2vw,1.85rem)] leading-[1.05] font-extrabold tracking-[-0.052em]">
        <Count value={value} format={format} />
      </strong>
      <div className="min-w-0 text-[0.6875rem] text-muted-foreground">{footer}</div>
    </article>
  );
}

/** Legenda: chave com o mesmo formato da marca (linha para linhas, quadrado para barras). */
export function Legend({
  items,
  className,
}: {
  items: { label: string; color: string; shape?: "line" | "rect" }[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] font-semibold text-muted-foreground", className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn("shrink-0", item.shape === "line" ? "h-[2px] w-3 rounded-full" : "size-2 rounded-[2px]")}
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** "Ver como tabela": o equivalente acessível de todo gráfico. */
export function ChartTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <details className="mt-3 text-xs text-muted-foreground">
      <summary className="w-fit cursor-pointer rounded-full font-semibold select-none hover:text-foreground">
        Ver como tabela
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left tabular-nums">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={c} scope="col" className={cn("py-1 font-bold", i > 0 && "text-right")}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row[0])} className="border-t border-line">
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row" className="py-1 font-semibold first-letter:uppercase">
                      {cell}
                    </th>
                  ) : (
                    <td key={i} className="py-1 text-right">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
