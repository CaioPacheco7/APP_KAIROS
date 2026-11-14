"use client";

import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useServerForm } from "@/lib/use-server-form";
import { saveHabitAction } from "@/server/habits";
import { WeekdayChips } from "./weekday-chips";

type HabitValues = { id: string; name: string; weekdays: number[] };

export function HabitEditDialog({ habit }: { habit: HabitValues }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Editar ${habit.name}`}
        onClick={() => setOpen(true)}
      >
        <PencilIcon />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar hábito</DialogTitle>
          </DialogHeader>
          <EditForm habit={habit} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditForm({ habit, onDone }: { habit: HabitValues; onDone: () => void }) {
  const { pending, onSubmit, fieldError, formError } = useServerForm(saveHabitAction, () => {
    toast.success("Hábito atualizado");
    onDone();
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input type="hidden" name="id" value={habit.id} />
      <Field label="Nome" htmlFor="he-name" error={fieldError("name")}>
        <Input id="he-name" name="name" defaultValue={habit.name} autoFocus autoComplete="off" maxLength={80} />
      </Field>
      <WeekdayChips idPrefix="he" defaultValue={habit.weekdays} />
      {(fieldError("weekdays") || formError) && (
        <p role="alert" className="text-sm text-destructive">
          {fieldError("weekdays") ?? formError}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
