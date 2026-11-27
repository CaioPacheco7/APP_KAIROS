export { cn } from "cn"

/** "novembro de 2026" -> "Novembro de 2026" (o ::first-letter não vale em flex/inline). */
export function capitalize(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text
}
