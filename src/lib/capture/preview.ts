/**
 * Prévia do que o registro rápido vai criar (usada na busca do topo).
 * Pura: recebe o resultado do interpretador e devolve um título e um detalhe.
 */
import { addDays, formatDayMonth } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import type { Intent } from "./parse";

export type CapturePreview = {
  kind: Exclude<Intent["kind"], "unknown">;
  title: string;
  detail: string;
};

/** "hoje", "ontem", "amanhã" ou "25/11". */
export function relativeDay(date: string, today: string): string {
  if (date === today) return "hoje";
  if (date === addDays(today, -1)) return "ontem";
  if (date === addDays(today, 1)) return "amanhã";
  return formatDayMonth(date);
}

const clip = (text: string, max = 80) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export function capturePreview(intent: Intent, today: string): CapturePreview | null {
  switch (intent.kind) {
    case "transaction": {
      const parts = [intent.description];
      if (intent.categoryHint && intent.categoryHint !== intent.description) parts.push(intent.categoryHint);
      if (!intent.categoryHint) parts.push("sem categoria");
      parts.push(relativeDay(intent.date, today));
      return {
        kind: "transaction",
        title: `${intent.type === "income" ? "Entrada" : "Gasto"} de ${formatBRL(intent.amount)}`,
        detail: parts.join(" · "),
      };
    }
    case "task":
      return {
        kind: "task",
        title: `Tarefa: ${clip(intent.title, 60)}`,
        detail: intent.dueDate ? `prazo ${relativeDay(intent.dueDate, today)}` : "sem prazo",
      };
    case "reminder":
      return {
        kind: "reminder",
        title: `Lembrete: ${clip(intent.title, 60)}`,
        detail: `${relativeDay(intent.date, today)}${intent.time ? ` às ${intent.time}` : ""}`,
      };
    case "note":
      return { kind: "note", title: "Nota", detail: clip(intent.text) };
    default:
      return null;
  }
}
