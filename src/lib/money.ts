/**
 * Dinheiro sempre em CENTAVOS (inteiro). Nunca float. (RN-01)
 */

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const brlCompact = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** 123456 -> "R$ 1.234,56" */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** 123456 -> "1,2 mil" (para eixos de gráfico) */
export function formatCompact(cents: number): string {
  return brlCompact.format(cents / 100);
}

/** 123456 -> "1234,56" (para preencher inputs) */
export function centsToInput(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const int = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${int},${frac}`;
}

/**
 * Converte texto digitado em centavos. Aceita "1.234,56", "1234,56",
 * "1234.56", "1234", "R$ 10". Retorna null se for inválido.
 *
 * Regra para ponto: "1.234" (grupos de 3 dígitos) é milhar -> 1234 reais;
 * "12.5" e "12.50" são decimais.
 */
export function parseMoneyToCents(
  input: string,
  { allowNegative = false }: { allowNegative?: boolean } = {},
): number | null {
  let s = input.trim().replace(/R\$/gi, "").replace(/\s/g, "");
  if (!s) return null;

  let negative = false;
  if (s.startsWith("-")) {
    if (!allowNegative) return null;
    negative = true;
    s = s.slice(1);
  }

  let normalized: string;
  if (s.includes(",")) {
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    normalized = s.replace(/\./g, "");
  } else {
    normalized = s;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const [int, frac = ""] = normalized.split(".");
  const cents = Number(int) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return null;

  return negative ? -cents : cents;
}
