"use client";

import {
  ArrowDownLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  BellRingIcon,
  CornerDownLeftIcon,
  ListTodoIcon,
  NotebookPenIcon,
  SearchIcon,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { parseCapture } from "@/lib/capture/parse";
import { capturePreview, type CapturePreview } from "@/lib/capture/preview";
import {
  moduleDef,
  moduleFor,
  searchDestinations,
  type Destination,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { sendChatMessageAction } from "@/server/chat";

type Account = { id: string; name: string };

/** A "orbe" do modelo, nas cores da marca: marfim, dourado e um toque de âmbar. */
export function Orb({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-[25px] shrink-0 rounded-full bg-[radial-gradient(ellipse_at_32%_24%,#fffaf0_6%,#f3d9a0_26%,transparent_58%),radial-gradient(ellipse_at_67%_54%,#e9b872,#a8742f_55%,#5a3c17_80%)] shadow-[inset_0_0_0_.75px_rgb(255_248_235/75%),inset_0_-2px_5px_#7a5220,0_0_0_3px_rgb(120_84_36/14%),0_2px_8px_rgb(90_60_20/35%)]",
        className,
      )}
    />
  );
}

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** Pílula de busca do topo: abre a paleta (clique, Ctrl+K ou "/"). */
export function AskBar({ accounts, today }: { accounts: Account[]; today: string }) {
  const pathname = usePathname();
  const hint = moduleDef(moduleFor(pathname)).hint;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const k = event.key.toLowerCase();
      if (k === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "/" && !event.metaKey && !event.ctrlKey && !isTypingTarget(event.target)) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <AskButton hint={hint} onClick={() => setOpen(true)} />
      <CommandPalette open={open} onOpenChange={setOpen} accounts={accounts} today={today} />
    </>
  );
}

/** O botão em si (também usado como esqueleto enquanto os dados carregam). */
export function AskButton({ hint, onClick, disabled }: { hint: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-haspopup="dialog"
      className="glass-inner relative flex min-h-[43px] w-full min-w-0 items-center gap-2.5 rounded-full py-1 pr-3.5 pl-[9px] text-left transition-colors outline-none hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring disabled:cursor-wait"
    >
      <Orb />
      <span className="sr-only">Abrir busca e registro rápido: </span>
      <span key={hint} className="animate-type-in min-w-0 truncate text-[0.78125rem] font-bold">
        {hint}
      </span>
      <kbd className="ml-auto hidden shrink-0 rounded-md border border-line px-1.5 py-0.5 font-sans text-[0.625rem] font-bold text-muted-foreground lg:inline">
        Ctrl K
      </kbd>
      <SearchIcon aria-hidden className="ml-auto size-[15px] shrink-0 text-muted-foreground lg:ml-0" />
    </button>
  );
}

const CAPTURE_ICON: Record<CapturePreview["kind"], LucideIcon> = {
  transaction: ArrowUpRightIcon,
  task: ListTodoIcon,
  reminder: BellRingIcon,
  note: NotebookPenIcon,
};

type Option =
  | { type: "capture"; id: string; preview: CapturePreview; income: boolean; blocked: boolean }
  | { type: "nav"; id: string; dest: Destination };

/**
 * Paleta de comandos: busca as telas do app e, se o texto parecer um registro
 * ("café 12,50", "tarefa: …", "lembrar de …", "anotar: …"), oferece salvar
 * direto daqui (o mesmo interpretador do Registrar, sem IA).
 */
function CommandPalette({
  open,
  onOpenChange,
  accounts,
  today,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  today: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  const trimmed = query.trim();
  const intent = trimmed.length >= 3 ? parseCapture(trimmed, today) : null;
  const preview = intent ? capturePreview(intent, today) : null;

  const options: Option[] = [];
  if (preview && intent) {
    const isTx = intent.kind === "transaction";
    options.push({
      type: "capture",
      id: `${listId}-capture`,
      preview,
      income: isTx && intent.type === "income",
      blocked: isTx && accounts.length === 0,
    });
  }
  for (const dest of searchDestinations(trimmed)) {
    options.push({ type: "nav", id: `${listId}-${dest.href}`, dest });
  }
  const active = options.length ? Math.min(cursor, options.length - 1) : -1;

  const close = () => {
    onOpenChange(false);
    setQuery("");
    setCursor(0);
  };

  function activate(option: Option) {
    if (option.type === "nav") {
      close();
      router.push(option.dest.href);
      return;
    }
    if (option.blocked) {
      close();
      router.push("/financas");
      return;
    }
    const data = new FormData();
    data.set("text", trimmed);
    if (accountId) data.set("account_id", accountId);
    startTransition(async () => {
      const result = await sendChatMessageAction({ status: "idle" }, data);
      if (result.status === "success") {
        close();
        toast.success(result.message ?? "Registrado.", {
          action: { label: "Ver", onClick: () => router.push("/registrar") },
        });
      } else if (result.status === "error") {
        toast.error(result.message);
      }
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!options.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((active + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((active - 1 + options.length) % options.length);
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!pending) activate(options[active]);
    }
  }

  const groups: Array<{ label: string; items: Option[] }> = [];
  const captureItems = options.filter((o) => o.type === "capture");
  if (captureItems.length) groups.push({ label: "Registrar", items: captureItems });
  for (const g of ["Telas", "Atalhos"] as const) {
    const items = options.filter((o) => o.type === "nav" && o.dest.group === g);
    if (items.length) groups.push({ label: g, items });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent initialFocus={inputRef} className="gap-3 p-[18px] sm:max-w-[485px]">
        <div>
          <DialogTitle>Buscar ou registrar</DialogTitle>
          <DialogDescription className="mt-1">
            Vá para qualquer tela ou escreva um gasto, uma tarefa, um lembrete ou uma nota.
          </DialogDescription>
        </div>

        <label className="glass-inner flex min-h-11 items-center gap-2 rounded-[12px] px-2.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
          <SearchIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? options[active].id : undefined}
            aria-label="Buscar uma tela ou escrever um registro"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            maxLength={500}
            autoComplete="off"
            placeholder="Ex.: transações, ou “café 12,50”"
            className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/85"
          />
        </label>

        {preview?.kind === "transaction" && accounts.length > 1 && (
          <label className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
            Lançar em
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="glass-inner h-8 rounded-full px-2.5 text-xs font-bold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id} className="bg-popover">
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div id={listId} role="listbox" aria-label="Resultados" className="-mx-1 grid max-h-[min(52vh,420px)] gap-3 overflow-y-auto px-1 pb-1">
          {groups.map((group) => (
            <div key={group.label} role="group" aria-label={group.label} className="grid gap-1.5">
              <p aria-hidden className="px-1 text-[0.6875rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                {group.label}
              </p>
              {group.items.map((option) => {
                const index = options.indexOf(option);
                const selected = index === active;
                const Icon =
                  option.type === "capture"
                    ? option.income
                      ? ArrowDownLeftIcon
                      : CAPTURE_ICON[option.preview.kind]
                    : ArrowRightIcon;
                const title = option.type === "capture" ? option.preview.title : option.dest.label;
                const detail =
                  option.type === "capture"
                    ? option.blocked
                      ? "Configure as Finanças para lançar gastos e entradas"
                      : option.preview.detail
                    : option.dest.description;
                return (
                  <div
                    key={option.id}
                    id={option.id}
                    role="option"
                    aria-selected={selected}
                    onMouseMove={() => setCursor(index)}
                    onClick={() => !pending && activate(option)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-[12px] border p-2.5 transition-colors",
                      selected ? "border-rim bg-raised" : "border-line bg-inner",
                      option.type === "capture" && "border-gold-fill/40",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-[10px]",
                        option.type === "capture" ? "bg-gold-soft text-gold" : "bg-inner text-muted-foreground",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-[0.8125rem]">{title}</strong>
                      <small className="block truncate text-[0.6875rem] text-muted-foreground">{detail}</small>
                    </span>
                    {selected && (
                      <span className="flex shrink-0 items-center gap-1 text-[0.625rem] font-bold text-muted-foreground">
                        {option.type === "capture" ? (pending ? "Salvando…" : "Salvar") : "Abrir"}
                        <CornerDownLeftIcon className="size-3" aria-hidden />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {options.length === 0 && (
            <p role="status" className="px-1 py-3 text-sm text-muted-foreground">
              Nada encontrado. Para registrar, inclua um valor (“café 12,50”) ou comece com “tarefa:”, “lembrar de” ou “anotar:”.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
