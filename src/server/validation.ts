import type { ZodError } from "zod";

/** Primeiro erro de cada campo: { campo: "mensagem" }. */
export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** Lê um campo de texto do FormData ("" se ausente ou se for arquivo). */
export function formString(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

/** "" -> null */
export function emptyToNull(value: string | undefined | null): string | null {
  const v = value?.trim();
  return v ? v : null;
}
