"use client";

import { SendIcon } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useServerForm } from "@/lib/use-server-form";
import { sendChatMessageAction } from "@/server/chat";

export function ChatComposer({
  accounts,
}: {
  accounts: { id: string; name: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { pending, onSubmit, formError } = useServerForm(
    sendChatMessageAction,
    () => {
      formRef.current?.reset();
      inputRef.current?.focus();
    },
  );

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-2">
      <div className="flex items-center gap-2">
        {accounts.length > 0 && (
          <NativeSelect
            name="account_id"
            aria-label="Conta para os lançamentos"
            className="w-40 shrink-0"
            defaultValue={accounts[0].id}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </NativeSelect>
        )}
        <Input
          ref={inputRef}
          name="text"
          autoFocus
          autoComplete="off"
          maxLength={500}
          placeholder="Ex.: hoje tomei um café na padaria R$ 50"
          aria-label="O que você quer registrar?"
          className="h-9"
        />
        <Button type="submit" size="lg" disabled={pending} aria-label="Enviar">
          <SendIcon />
        </Button>
      </div>
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
    </form>
  );
}
