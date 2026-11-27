"use client";

import { SendHorizontalIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { useServerForm } from "@/lib/use-server-form";
import { sendChatMessageAction } from "@/server/chat";

/** Campo de escrita do chat, com sugestões que preenchem o texto com um toque. */
export function ChatComposer({
  accounts,
  suggestions,
}: {
  accounts: { id: string; name: string }[];
  suggestions: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");

  const { pending, onSubmit, formError } = useServerForm(sendChatMessageAction, () => {
    setText("");
    inputRef.current?.focus();
  });

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setText(s);
              inputRef.current?.focus();
            }}
            className="shrink-0 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground pointer-coarse:py-2.5 transition-colors hover:border-gold-fill/50 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-input bg-card p-2 shadow-card transition-shadow focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/25 sm:flex-row sm:items-center">
        {accounts.length > 0 && (
          <NativeSelect
            name="account_id"
            aria-label="Conta para os lançamentos"
            className="w-full shrink-0 sm:w-44"
            defaultValue={accounts[0].id}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </NativeSelect>
        )}
        <div className="flex min-w-0 flex-1 items-center gap-2">
        <input
          ref={inputRef}
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          autoComplete="off"
          maxLength={500}
          placeholder="Escreva do seu jeito: hoje tomei um café na padaria R$ 50"
          aria-label="O que você quer registrar?"
          className="h-10 min-w-0 flex-1 bg-transparent px-2 text-base outline-none placeholder:text-muted-foreground/70 md:text-sm"
        />
        <Button
          type="submit"
          variant="gold"
          size="icon"
          disabled={pending || text.trim().length === 0}
          aria-label="Enviar"
          className="shrink-0 rounded-xl"
        >
          <SendHorizontalIcon />
        </Button>
        </div>
      </div>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
    </form>
  );
}
