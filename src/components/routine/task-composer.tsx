"use client";

import { PlusIcon } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useServerForm } from "@/lib/use-server-form";
import { saveTaskAction } from "@/server/routine";

/** Linha para adicionar uma tarefa (kind="task") ou um lembrete (kind="reminder"). */
export function TaskComposer({
  kind,
  today,
}: {
  kind: "task" | "reminder";
  today: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const { pending, onSubmit, fieldError, formError } = useServerForm(
    saveTaskAction,
    () => formRef.current?.reset(),
  );
  const isReminder = kind === "reminder";

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-2">
      <input type="hidden" name="kind" value={kind} />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          name="title"
          placeholder={isReminder ? "Do que lembrar? Ex.: pagar a luz" : "Nova tarefa. Ex.: renovar CNH"}
          aria-label={isReminder ? "Lembrete" : "Tarefa"}
          autoComplete="off"
          maxLength={160}
          className="h-9 min-w-48 flex-1"
          aria-invalid={Boolean(fieldError("title"))}
        />
        <Input
          name="due_date"
          type="date"
          aria-label={isReminder ? "Dia do lembrete" : "Prazo (opcional)"}
          defaultValue={isReminder ? today : ""}
          className="h-9 w-40 [color-scheme:dark]"
        />
        {isReminder && (
          <Input
            name="time"
            type="time"
            aria-label="Hora (opcional)"
            className="h-9 w-28 [color-scheme:dark]"
          />
        )}
        <NativeSelect
          name="priority"
          aria-label="Prioridade"
          defaultValue="normal"
          className="h-9 w-32"
        >
          <option value="low">Baixa</option>
          <option value="normal">Normal</option>
          <option value="high">Alta</option>
        </NativeSelect>
        <Button type="submit" size="lg" disabled={pending}>
          <PlusIcon /> Adicionar
        </Button>
      </div>
      {(fieldError("title") || fieldError("due_date") || fieldError("time") || formError) && (
        <p role="alert" className="text-sm text-destructive">
          {fieldError("title") ?? fieldError("due_date") ?? fieldError("time") ?? formError}
        </p>
      )}
    </form>
  );
}
