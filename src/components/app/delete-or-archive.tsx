"use client";

import { ArchiveIcon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Excluir uma conta ou um cartão. Sem lançamentos: exclui. Com lançamentos:
 * a pessoa escolhe entre arquivar (some das telas, o histórico fica) e
 * excluir junto com os lançamentos.
 */
export function DeleteOrArchive({
  id,
  name,
  noun,
  movements,
  action,
}: {
  id: string;
  name: string;
  /** "conta" ou "cartão" */
  noun: string;
  movements: number;
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const run = (mode: "archive" | "delete") =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("mode", mode);
      await action(fd);
      setOpen(false);
      const end = noun === "cartão" ? "o" : "a";
      toast.success(mode === "archive" ? `“${name}” arquivad${end}` : `“${name}” excluíd${end}`);
    });

  return (
    <>
      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setOpen(true)}>
        <Trash2Icon /> Excluir
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Excluir {noun === "cartão" ? "o cartão" : "a conta"} “{name}”?</DialogTitle>
            <DialogDescription>
              {movements === 0
                ? `Não há nada lançado ${noun === "cartão" ? "neste cartão" : "nesta conta"}.`
                : `Há ${movements} ${movements === 1 ? "lançamento" : "lançamentos"} ${noun === "cartão" ? "neste cartão" : "nesta conta"}. Escolha o que fazer:`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {movements > 0 && (
              <Button variant="outline" onClick={() => run("archive")} disabled={pending} className="h-auto justify-start py-2.5 text-left whitespace-normal">
                <ArchiveIcon />
                <span>
                  <strong className="block">Arquivar (recomendado)</strong>
                  <span className="block text-xs font-medium text-muted-foreground">
                    Some das telas e dos formulários; os lançamentos continuam no histórico.
                  </span>
                </span>
              </Button>
            )}
            <Button variant="destructive" onClick={() => run("delete")} disabled={pending} className="h-auto justify-start py-2.5 text-left whitespace-normal">
              <Trash2Icon />
              <span>
                <strong className="block">{movements > 0 ? `Excluir com os ${movements} lançamentos` : "Excluir"}</strong>
                {movements > 0 && (
                  <span className="block text-xs font-medium opacity-80">
                    Apaga {noun === "cartão" ? "o cartão" : "a conta"} e tudo que foi lançado {noun === "cartão" ? "nele (compras e pagamentos)" : "nela, inclusive transferências e contas fixas"}.
                  </span>
                )}
              </span>
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
