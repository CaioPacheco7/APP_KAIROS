"use client";

import { PlusIcon, RepeatIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { RepeatPreset } from "@/lib/reminders";
import { useServerForm } from "@/lib/use-server-form";
import { saveTaskAction } from "@/server/routine";
import { WeekdayChips } from "./weekday-chips";

/**
 * Adicionar uma tarefa (kind="task") ou um lembrete (kind="reminder").
 * "Repetir" transforma em lembrete fixo: todo dia, dias úteis ou dias
 * escolhidos, num horário (o celular avisa se as notificações estiverem ativas).
 */
export function TaskComposer({
  kind,
  today,
}: {
  kind: "task" | "reminder";
  today: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [repeat, setRepeat] = useState<RepeatPreset>("once");
  const { pending, onSubmit, fieldError, formError } = useServerForm(saveTaskAction, (result) => {
    if (result.message) toast.success(result.message);
    formRef.current?.reset();
    setRepeat("once");
  });
  const isReminder = kind === "reminder";
  const fixed = repeat !== "once";
  const error = fieldError("title") ?? fieldError("due_date") ?? fieldError("time") ?? fieldError("weekdays") ?? formError;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      <input type="hidden" name="kind" value={kind} />
      <Input
        name="title"
        placeholder={isReminder ? "Do que lembrar? Ex.: beber 2,5 L de água" : "Nova tarefa. Ex.: renovar CNH"}
        aria-label={isReminder ? "Lembrete" : "Tarefa"}
        autoComplete="off"
        maxLength={160}
        aria-invalid={Boolean(fieldError("title"))}
      />
      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect
          name="repeat"
          aria-label="Repetir"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value as RepeatPreset)}
          className="w-[11.5rem]"
        >
          <option value="once">{isReminder ? "Uma vez" : "Não repete"}</option>
          <option value="daily">Todo dia</option>
          <option value="weekdays">Dias úteis (seg a sex)</option>
          <option value="custom">Escolher os dias…</option>
        </NativeSelect>
        {!fixed && (
          <Input
            name="due_date"
            type="date"
            aria-label={isReminder ? "Dia do lembrete" : "Prazo (opcional)"}
            defaultValue={isReminder ? today : ""}
            className="w-40"
          />
        )}
        {(isReminder || fixed) && (
          <Input
            key={fixed ? "fixo" : "unico"}
            name="time"
            type="time"
            aria-label={fixed ? "Horário" : "Hora (opcional)"}
            defaultValue={fixed ? "09:00" : undefined}
            required={fixed}
            className="w-28"
          />
        )}
        {!fixed && (
          <NativeSelect name="priority" aria-label="Prioridade" defaultValue="normal" className="w-32">
            <option value="low">Baixa</option>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
          </NativeSelect>
        )}
      </div>
      {repeat === "custom" && <WeekdayChips idPrefix={`${kind}-repeat`} defaultValue={[1, 3, 5]} />}
      {fixed && (
        <p className="flex items-start gap-1.5 text-[0.8125rem] text-muted-foreground">
          <RepeatIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            Vira um <strong className="text-foreground">lembrete fixo</strong>
            {isReminder ? "" : " (fica em Lembretes)"}: o celular avisa no horário, nos dias escolhidos.
          </span>
        </p>
      )}
      <Button type="submit" variant="gold" disabled={pending} className="w-fit">
        <PlusIcon /> {pending ? "Salvando…" : "Adicionar"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
