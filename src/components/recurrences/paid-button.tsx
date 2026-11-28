"use client";

import { CheckIcon, RotateCcwIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { setPaidAction } from "@/server/recurrences";

/**
 * "Paguei" / "Recebi" de uma conta fixa (e o desfazer). Se a conta venceu
 * antes de a pessoa começar a usar o app, pergunta se foi paga antes (não mexe
 * no saldo informado) ou agora (desconta do saldo). RN-39.
 */
export function PaidButton({
  id,
  settled,
  income,
  askBeforeStart,
  className,
}: {
  id: string;
  settled: boolean;
  income: boolean;
  /** venceu antes do dia em que a pessoa começou a usar o app */
  askBeforeStart: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const verb = income ? "Recebi" : "Paguei";

  const send = (paid: boolean, beforeStart = false) =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("paid", String(paid));
      fd.set("before_start", String(beforeStart));
      await setPaidAction(fd);
      setOpen(false);
    });

  if (settled) {
    return (
      <Button size="sm" variant="ghost" className={cn("text-muted-foreground", className)} disabled={pending} onClick={() => send(false)}>
        <RotateCcwIcon aria-hidden /> Desfazer
      </Button>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={className}
        disabled={pending}
        onClick={() => (askBeforeStart ? setOpen(true) : send(true))}
      >
        <CheckIcon aria-hidden /> {verb}
      </Button>
      {askBeforeStart && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>{income ? "Quando você recebeu?" : "Quando você pagou?"}</DialogTitle>
              <DialogDescription>
                {income
                  ? "Se o dinheiro caiu antes de você começar a usar o KAIROS, o saldo que você informou já conta com ele."
                  : "Se você pagou antes de começar a usar o KAIROS, o saldo que você informou já desconta essa conta."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Button variant="outline" disabled={pending} onClick={() => send(true, true)} className="h-auto justify-start py-2.5 text-left whitespace-normal">
                <span>
                  <strong className="block">{income ? "Antes de começar a usar o app" : "Antes de começar a usar o app"}</strong>
                  <span className="block text-xs font-medium text-muted-foreground">Marca como {income ? "recebido" : "pago"} sem mexer no saldo</span>
                </span>
              </Button>
              <Button variant="outline" disabled={pending} onClick={() => send(true)} className="h-auto justify-start py-2.5 text-left whitespace-normal">
                <span>
                  <strong className="block">Agora, depois de começar</strong>
                  <span className="block text-xs font-medium text-muted-foreground">
                    {income ? "Soma no saldo da conta" : "Desconta do saldo da conta"}
                  </span>
                </span>
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
