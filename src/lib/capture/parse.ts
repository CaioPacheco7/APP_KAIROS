/**
 * Interpretador do chat de registro rápido. SEM IA: regras simples e
 * determinísticas (palavras-chave, valores, datas). Pura e testável.
 *
 * Exemplos entendidos:
 *   "hoje tomei um café na padaria R$ 50"        -> despesa 50,00 (Alimentação fora)
 *   "recebi 3000 de salário"                     -> receita 3.000,00 (Salário)
 *   "uber 23,90 ontem"                           -> despesa 23,90 (Transporte)
 *   "tarefa: renovar CNH até 20/12"              -> tarefa com prazo
 *   "lembrar de pagar a luz amanhã 9h"           -> lembrete
 *   "beber 2,5 L de água todo dia às 10h"        -> lembrete fixo (todo dia, 10:00)
 *   "preciso criar uma conta PJ"                 -> tarefa (sem valor em dinheiro = afazer)
 *   "anotar: ideia de presente para a Ana"       -> nota
 */

import { addDays, isISODate } from "@/lib/dates";
import { parseMoneyToCents } from "@/lib/money";
import { extractRepeat } from "@/lib/reminders";

/** Horário de um lembrete fixo quando a pessoa não diz qual. */
export const DEFAULT_REMINDER_TIME = "09:00";

export type Intent =
  | {
      kind: "transaction";
      type: "income" | "expense";
      amount: number;
      date: string;
      description: string;
      categoryHint: string | null;
    }
  | { kind: "task"; title: string; dueDate: string | null }
  | {
      kind: "reminder";
      title: string;
      date: string;
      time: string | null;
      /** lembrete fixo: dias da semana (1 = segunda ... 7 = domingo) */
      repeat?: number[];
    }
  | { kind: "note"; text: string }
  | { kind: "unknown"; message: string };

/** minúsculas e sem acentos, para comparar palavras-chave */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Regex com limites de palavra que entendem acentos. O `\b` do JavaScript
 * trata "ã", "à", "é"... como não-letras, então "amanhã" nunca casaria.
 */
function uword(source: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`, "iu");
}

// ---------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------

type DateExtraction = { date: string | null; rest: string };

/**
 * Procura uma data no texto ("hoje", "ontem", "amanhã", "dd/mm[/aaaa]",
 * "dia N") e a remove. `future`: para tarefas/lembretes, "dia N" que já
 * passou vira o mês seguinte.
 */
export function extractDate(
  text: string,
  today: string,
  { future = false }: { future?: boolean } = {},
): DateExtraction {
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => string | null]> = [
    [uword("depois\\s+de\\s+amanh[ãa]"), () => addDays(today, 2)],
    [uword("amanh[ãa]"), () => addDays(today, 1)],
    [/\banteontem\b/i, () => addDays(today, -2)],
    [/\bontem\b/i, () => addDays(today, -1)],
    [/\bhoje\b/i, () => today],
    [
      /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/,
      (m) => {
        const day = Number(m[1]);
        const month = Number(m[2]);
        let year = m[3] ? Number(m[3]) : Number(today.slice(0, 4));
        if (m[3] && m[3].length === 2) year += 2000;
        const iso = `${year}-${pad(month)}-${pad(day)}`;
        if (!isISODate(iso)) return null;
        // "20/12" sem ano e já passou -> próximo ano (só para futuro)
        if (future && !m[3] && iso < today) {
          const next = `${year + 1}-${pad(month)}-${pad(day)}`;
          return isISODate(next) ? next : null;
        }
        return iso;
      },
    ],
    [
      /\bdia\s+(\d{1,2})\b/i,
      (m) => {
        const day = Number(m[1]);
        const year = Number(today.slice(0, 4));
        const month = Number(today.slice(5, 7));
        const thisMonth = `${year}-${pad(month)}-${pad(day)}`;
        if (!isISODate(thisMonth)) return null;
        if (future && thisMonth < today) {
          const ny = month === 12 ? year + 1 : year;
          const nm = month === 12 ? 1 : month + 1;
          const next = `${ny}-${pad(nm)}-${pad(day)}`;
          return isISODate(next) ? next : null;
        }
        return thisMonth;
      },
    ],
  ];

  for (const [re, resolve] of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const date = resolve(m);
    if (date) return { date, rest: text.replace(re, " ") };
  }
  return { date: null, rest: text };
}

/** "15h", "15h30", "15:30", "às 9" -> "HH:MM" (+ texto sem o horário) */
export function extractTime(text: string): {
  time: string | null;
  rest: string;
} {
  const patterns: RegExp[] = [
    uword("(?:às|as)\\s+(\\d{1,2})(?:[:h](\\d{2}))?\\s*h?"),
    /\b(\d{1,2})(?:h(\d{2})?|:(\d{2}))\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const hour = Number(m[1]);
    const minute = Number(m[2] ?? m[3] ?? 0);
    if (hour > 23 || minute > 59) continue;
    return { time: `${pad(hour)}:${pad(minute)}`, rest: text.replace(re, " ") };
  }
  return { time: null, rest: text };
}

// ---------------------------------------------------------------------
// Valor
// ---------------------------------------------------------------------

type AmountExtraction = { amount: number | null; rest: string };

export function extractAmount(text: string): AmountExtraction {
  const cleanNumber = (s: string) => s.replace(/[.,]+$/, "");

  // 1) "R$ 50", "R$50,90"
  let m = text.match(/R\$\s*(\d[\d.,]*)/i);
  if (m) {
    return {
      amount: parseMoneyToCents(cleanNumber(m[1])),
      rest: text.replace(m[0], " "),
    };
  }
  // 2) "50 reais", "30 conto"
  m = text.match(/(\d[\d.,]*)\s*(?:reais|real|contos?|pilas?|pau)\b/i);
  if (m) {
    return {
      amount: parseMoneyToCents(cleanNumber(m[1])),
      rest: text.replace(m[0], " "),
    };
  }
  // 3) último número solto (as datas e horas já foram removidas antes)
  const bare = [...text.matchAll(/(?<![\d.,/:])(\d+(?:[.,]\d+)*)(?![\d/:])/g)];
  const last = bare.at(-1);
  if (last) {
    return {
      amount: parseMoneyToCents(cleanNumber(last[1])),
      rest: text.replace(last[0], " "),
    };
  }
  return { amount: null, rest: text };
}

// ---------------------------------------------------------------------
// Tipo e categoria
// ---------------------------------------------------------------------

const INCOME_WORDS = [
  "recebi", "ganhei", "entrou", "caiu", "salario", "vendi", "venda",
  "rendimento", "rendimentos", "reembolso", "dividendo", "dividendos",
  "freela", "freelance", "bonus", "renda", "depositaram", "depositou",
  "me pagaram", "pagamento recebido", "pix recebido", "cashback",
];

/** [categoria, palavras-chave]. A ordem importa: a primeira que casar vence. */
const EXPENSE_CATEGORIES: Array<[string, string[]]> = [
  ["Assinaturas", ["netflix", "spotify", "assinatura", "prime", "youtube", "icloud", "disney", "hbo", "deezer"]],
  ["Mercado", ["mercado", "supermercado", "feira", "acougue", "hortifruti", "atacadao", "sacolao", "padaria do mercado", "alimentacao", "comida", "rancho"]],
  ["Alimentação fora", ["padaria", "cafe", "cafezinho", "lanche", "restaurante", "almoco", "almocei", "jantar", "jantei", "pizza", "hamburguer", "ifood", "sorvete", "bar", "cerveja", "churrasco", "salgado", "marmita", "pastel", "acai"]],
  ["Transporte", ["uber", "99", "onibus", "gasolina", "combustivel", "estacionamento", "pedagio", "metro", "taxi", "passagem", "alcool", "etanol", "diesel", "cabify"]],
  ["Moradia", ["aluguel", "condominio", "iptu", "reforma", "moveis"]],
  ["Contas e taxas", ["luz", "energia", "agua", "internet", "telefone", "celular", "gas", "taxa", "tarifa", "boleto", "imposto", "multa"]],
  ["Saúde", ["farmacia", "remedio", "medico", "consulta", "exame", "dentista", "plano de saude", "terapia", "psicologo"]],
  ["Educação", ["curso", "faculdade", "livro", "escola", "mensalidade", "apostila"]],
  ["Lazer", ["cinema", "show", "viagem", "jogo", "festa", "balada", "parque", "ingresso", "hotel", "passeio"]],
  ["Compras", ["roupa", "tenis", "sapato", "shopping", "amazon", "mercado livre", "shein", "presente", "camisa", "calca"]],
  ["Outras despesas", ["consorcio", "financiamento", "emprestimo", "parcela", "parcelas", "cartao", "fatura"]],
];

const INCOME_CATEGORIES: Array<[string, string[]]> = [
  ["Salário", ["salario", "contracheque", "holerite"]],
  ["Investimentos", ["dividendo", "dividendos", "rendimento", "rendimentos", "juros", "cdb", "fii"]],
  ["Renda extra", ["freela", "freelance", "extra", "bico", "venda", "vendi", "bonus", "cashback"]],
];

function hasWord(normalized: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(normalized);
}

function detectType(normalized: string): "income" | "expense" {
  return INCOME_WORDS.some((w) => hasWord(normalized, w)) ? "income" : "expense";
}

function detectCategory(
  normalized: string,
  type: "income" | "expense",
): string | null {
  const table = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  for (const [category, words] of table) {
    if (words.some((w) => hasWord(normalized, w))) return category;
  }
  return type === "income" ? "Outras receitas" : null;
}

/** Sugere a categoria para um texto livre (ex.: nome de uma conta fixa). */
export function categoryHintFor(
  text: string,
  type: "income" | "expense",
): string | null {
  return detectCategory(norm(text), type);
}

// ---------------------------------------------------------------------
// Texto de descrição
// ---------------------------------------------------------------------

function tidy(text: string): string {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/^[\s,.:;\-–—]+|[\s,.:;\-–—]+$/g, "")
    // conectores soltos nas pontas, depois de remover valor/data
    .replace(/^(?:de|em|no|na|por|com|e|a|o|para|pra)\s+/i, "")
    .replace(/\s+(?:de|em|no|na|por|com|e|a|o|para|pra|até|ate)$/i, "")
    .trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "";
}

// ---------------------------------------------------------------------
// Entrada principal
// ---------------------------------------------------------------------

const HELP =
  "Não entendi. Tente: “gastei R$ 50 na padaria”, “recebi 3000 de salário”, " +
  "“preciso renovar a CNH até 20/12”, “lembrar de pagar a luz amanhã 9h”, " +
  "“beber água todo dia às 10h” ou “anotar: ideia de presente”.";

// ---------------------------------------------------------------------
// Afazeres sem valor em dinheiro: tarefa, lembrete ou lembrete fixo
// ---------------------------------------------------------------------

/** "preciso", "tenho que", "não esquecer de"... no começo = é um afazer. */
const INTENT_START =
  /^(?:eu\s+)?(?:preciso|precisava|precisaria|tenho que|tenho de|tinha que|vou ter que|devo|nao posso esquecer|nao esquecer|falta|faltou)\b(?:\s+(?:de|que))?/;

/** Verbos de afazer comuns (no infinitivo, sem acento). */
const TODO_VERBS = new Set([
  "abrir", "agendar", "alimentar", "arrumar", "assinar", "beber", "buscar", "cancelar", "checar", "comprar",
  "comparecer", "conferir", "consertar", "conversar", "correr", "cozinhar", "criar", "dar", "declarar",
  "depositar", "devolver", "enviar", "entregar", "estudar", "fazer", "fechar", "falar", "imprimir", "ir",
  "lavar", "ler", "levar", "ligar", "limpar", "mandar", "marcar", "matricular", "organizar", "pagar",
  "passear", "pedir", "pegar", "preparar", "regar", "renovar", "reservar", "resolver", "responder",
  "revisar", "sacar", "solicitar", "tirar", "tomar", "transferir", "treinar", "trocar", "ver", "verificar", "visitar",
]);

const HAS_CURRENCY = /R\$|\b(?:reais|real|contos?|pilas?)\b/i;

/** O texto parece um afazer (e não um gasto)? */
function looksLikeTodo(text: string): boolean {
  if (HAS_CURRENCY.test(text)) return false;
  const n = norm(text).trim();
  if (INTENT_START.test(n)) return true;
  const first = n.replace(/^eu\s+/, "").split(/\s+/)[0] ?? "";
  if (TODO_VERBS.has(first)) return true;
  return extractRepeat(text).days !== null;
}

/** Tira "preciso", "tenho que"... do começo do título. */
function stripIntent(text: string): string {
  const n = norm(text);
  const m = n.match(INTENT_START);
  return m ? text.slice(m[0].length) : text;
}

/** Afazer: com repetição vira lembrete fixo; com hora, lembrete; senão, tarefa. */
function todoIntent(text: string, today: string, { forceReminder = false } = {}): Intent | null {
  const { days, rest: noRepeat } = extractRepeat(text);
  const { date, rest: noDate } = extractDate(noRepeat, today, { future: true });
  const { time, rest } = extractTime(noDate);
  const title = tidy(stripIntent(rest));
  if (!title) return null;
  if (days) return { kind: "reminder", title, date: today, time: time ?? DEFAULT_REMINDER_TIME, repeat: days };
  if (time || forceReminder) return { kind: "reminder", title, date: date ?? today, time };
  return { kind: "task", title, dueDate: date };
}

export function parseCapture(input: string, today: string): Intent {
  const text = input.trim();
  if (!text) return { kind: "unknown", message: HELP };

  // Prefixos explícitos para a rotina
  let m = text.match(/^(?:anotar|anota|nota)\b\s*[:\-–]?\s*(.*)$/is);
  if (m) {
    const body = m[1].trim();
    return body
      ? { kind: "note", text: body }
      : { kind: "unknown", message: "O que você quer anotar? Ex.: “anotar: ideia de presente”." };
  }

  m = text.match(/^(?:tarefa|todo|fazer)\b\s*[:\-–]?\s*(.*)$/is);
  if (m) {
    const { days } = extractRepeat(m[1]);
    // "tarefa: beber água todo dia 10h" -> lembrete fixo; senão, tarefa com prazo
    if (days) return todoIntent(m[1], today) ?? { kind: "unknown", message: "Qual é a tarefa? Ex.: “tarefa: renovar CNH até 20/12”." };
    const { date, rest } = extractDate(m[1], today, { future: true });
    const title = tidy(rest);
    return title
      ? { kind: "task", title, dueDate: date }
      : { kind: "unknown", message: "Qual é a tarefa? Ex.: “tarefa: renovar CNH até 20/12”." };
  }

  m = text.match(/^(?:lembrar|lembrete|me\s+lembra(?:r)?|lembra)\b\s*(?:de|que)?\s*[:\-–]?\s*(.*)$/is);
  if (m) {
    return (
      todoIntent(m[1], today, { forceReminder: true }) ?? {
        kind: "unknown",
        message: "Do que devo lembrar? Ex.: “lembrar de pagar a luz amanhã 9h”.",
      }
    );
  }

  // Afazer sem valor em dinheiro ("preciso criar uma conta PJ", "ligar pro banco amanhã 10h")
  if (looksLikeTodo(text)) {
    const todo = todoIntent(text, today);
    if (todo) return todo;
  }

  // Financeiro
  const { date, rest: noDate } = extractDate(text, today);
  // O horário não importa para o gasto; só é removido para não virar "valor".
  const { rest: noTime } = extractTime(noDate);
  const { amount, rest } = extractAmount(noTime);

  if (amount === null) {
    return {
      kind: "unknown",
      message: "Não achei um valor nem um afazer. " + HELP,
    };
  }
  if (amount <= 0) {
    return { kind: "unknown", message: "O valor precisa ser maior que zero." };
  }

  const normalized = norm(text);
  const type = detectType(normalized);
  const categoryHint = detectCategory(normalized, type);
  const description =
    tidy(rest) || categoryHint || (type === "income" ? "Receita" : "Despesa");

  return {
    kind: "transaction",
    type,
    amount,
    date: date ?? today,
    description,
    categoryHint,
  };
}
