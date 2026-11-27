"use client";

import { PlusIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerForm } from "@/lib/use-server-form";
import { saveHabitAction } from "@/server/habits";
import { WeekdayChips } from "./weekday-chips";

const SUGGESTIONS = [
  "Tomar creatina",
  "Beber 2 litros de água",
  "Treinar",
  "Ler 10 páginas",
  "Meditar",
  "Dormir até 23h",
];

/** Adicionar um hábito novo (com sugestões e dias da semana). */
export function HabitComposer() {
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState("");
  // muda a chave para remontar os chips (voltam a "todos os dias") depois de salvar
  const [formKey, setFormKey] = useState(0);

  const { pending, onSubmit, fieldError, formError } = useServerForm(saveHabitAction, () => {
    setName("");
    setFormKey((k) => k + 1);
  });

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      <div>
        <p className="text-[0.9375rem] leading-tight font-extrabold tracking-[-0.02em]">Adicionar um hábito</p>
        <p className="mt-0.5 text-[0.75rem] text-muted-foreground">O que você quer fazer todo dia (ou em alguns dias da semana).</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setName(s)}
            className="glass-inner rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-raised hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Tomar creatina"
          aria-label="Nome do hábito"
          autoComplete="off"
          maxLength={80}
          aria-invalid={Boolean(fieldError("name"))}
        />
        <Button type="submit" variant="gold" disabled={pending} className="shrink-0">
          <PlusIcon /> Adicionar
        </Button>
      </div>

      <WeekdayChips key={formKey} idPrefix="hc" />

      {(fieldError("name") || fieldError("weekdays") || formError) && (
        <p role="alert" className="text-sm text-destructive">
          {fieldError("name") ?? fieldError("weekdays") ?? formError}
        </p>
      )}
    </form>
  );
}
