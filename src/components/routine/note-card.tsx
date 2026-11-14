import { PinIcon, PinOffIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteNoteAction, toggleNotePinAction } from "@/server/routine";
import { NoteDialog } from "./note-dialog";

export type NoteRow = { id: string; title: string; body: string; pinned: boolean };

/** Cartão de uma nota: fixar, editar e excluir. */
export function NoteCard({ note, lines = 6 }: { note: NoteRow; lines?: number }) {
  return (
    <Card className="h-full transition-all duration-300 hover:-translate-y-0.5">
      <CardContent className="flex h-full flex-col gap-2">
        {note.title && <p className="font-display text-2xl leading-tight">{note.title}</p>}
        <p
          className="text-sm whitespace-pre-wrap text-muted-foreground"
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: lines,
            overflow: "hidden",
          }}
        >
          {note.body}
        </p>
        <div className="mt-auto flex items-center justify-end">
          <form action={toggleNotePinAction}>
            <input type="hidden" name="id" value={note.id} />
            <input type="hidden" name="pinned" value={String(!note.pinned)} />
            <Button
              type="submit"
              variant="ghost"
              size="icon-sm"
              aria-label={note.pinned ? "Desafixar" : "Fixar no topo"}
            >
              {note.pinned ? <PinOffIcon /> : <PinIcon />}
            </Button>
          </form>
          <NoteDialog note={note} />
          <form action={deleteNoteAction}>
            <input type="hidden" name="id" value={note.id} />
            <Button type="submit" variant="ghost" size="icon-sm" aria-label="Excluir nota">
              <Trash2Icon />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
