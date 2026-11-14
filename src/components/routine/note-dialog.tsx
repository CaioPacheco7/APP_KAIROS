"use client";

import { PencilIcon, PlusIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useServerForm } from "@/lib/use-server-form";
import { saveNoteAction } from "@/server/routine";

type NoteValues = { id: string; title: string; body: string };

export function NoteDialog({ note }: { note?: NoteValues }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {note ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Editar nota"
          onClick={() => setOpen(true)}
        >
          <PencilIcon />
        </Button>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          <PlusIcon /> Nova nota
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{note ? "Editar nota" : "Nova nota"}</DialogTitle>
          </DialogHeader>
          <NoteForm note={note} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function NoteForm({ note, onDone }: { note?: NoteValues; onDone: () => void }) {
  const { pending, onSubmit, fieldError, formError } = useServerForm(
    saveNoteAction,
    () => {
      toast.success(note ? "Nota atualizada" : "Nota salva");
      onDone();
    },
  );

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      {note && <input type="hidden" name="id" value={note.id} />}
      <Field label="Título (opcional)" htmlFor="note-title" error={fieldError("title")}>
        <Input
          id="note-title"
          name="title"
          autoComplete="off"
          defaultValue={note?.title ?? ""}
        />
      </Field>
      <Field label="Texto" htmlFor="note-body" error={fieldError("body")}>
        <Textarea
          id="note-body"
          name="body"
          rows={8}
          autoFocus
          defaultValue={note?.body ?? ""}
        />
      </Field>
      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
