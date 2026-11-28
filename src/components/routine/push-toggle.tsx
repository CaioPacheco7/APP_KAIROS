"use client";

import { BellOffIcon, BellRingIcon, SendIcon } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { currentPushState, isBrave, subscribeThisDevice, type PushState } from "@/lib/push-client";
import { BRAVE_PUSH_PATH, pushFailureDetail, pushFailureHelp, toFailure, type PushFailure } from "@/lib/push-errors";
import { cn } from "@/lib/utils";
import { removePushSubscriptionAction, savePushSubscriptionAction, sendTestPushAction } from "@/server/push";

const TEXT: Record<Exclude<PushState, "checking">, string> = {
  unsupported: "Este navegador não recebe notificações. No celular, use o app instalado (Chrome no Android).",
  "needs-install": "No iPhone, as notificações só funcionam no app instalado: Compartilhar → Adicionar à Tela de Início, e ative por lá.",
  "no-server": "As notificações ainda não foram ligadas no servidor do KAIROS.",
  denied: "As notificações do KAIROS estão bloqueadas neste aparelho. Libere em Configurações → Apps → KAIROS → Notificações (ou nas permissões do site no navegador).",
  off: "Ative para o celular avisar na hora dos seus lembretes, mesmo com o app fechado.",
  on: "Ativas neste aparelho: os lembretes chegam na hora, mesmo com o app fechado.",
};

/**
 * O celular tem a inscrição, mas o KAIROS pode não ter (falhou ao salvar,
 * dados apagados). Reenvia uma vez por sessão; o servidor só atualiza.
 */
function resync(subscription: PushSubscription) {
  const key = `kairos-push-sync:${subscription.endpoint.slice(-24)}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // sem sessionStorage: reenvia mesmo assim, não faz mal
  }
  savePushSubscriptionAction(subscription.toJSON(), navigator.userAgent).catch(() => undefined);
}

/**
 * Ativar/desativar as notificações deste aparelho. `compact`: só aparece
 * quando dá para ativar (convite), some quando já está ativo.
 */
export function PushToggle({ compact = false, className }: { compact?: boolean; className?: string }) {
  const [state, setState] = useState<PushState>("checking");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [failure, setFailure] = useState<PushFailure | null>(null);
  const [brave, setBrave] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    currentPushState().then((r) => {
      if (!alive) return;
      setBrave(isBrave());
      setState(r.state);
      setSubscription(r.subscription);
      if (r.state === "on" && r.subscription) resync(r.subscription);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (state === "checking") return null;
  if (compact && state !== "off") return null;

  const fail = (f: PushFailure) => {
    setFailure(f);
    toast.error("As notificações não ativaram. O motivo está no cartão.");
  };

  const activate = () =>
    start(async () => {
      const result = await subscribeThisDevice();
      if (result.status === "denied") {
        setFailure(null);
        setState("denied");
        return;
      }
      if (result.status === "dismissed") {
        toast("Você fechou o pedido sem permitir. Toque de novo para ativar.");
        return;
      }
      if (result.status === "failed") {
        fail(result.failure);
        return;
      }
      const sub = result.subscription;
      try {
        const saved = await savePushSubscriptionAction(sub.toJSON(), navigator.userAgent);
        if (!saved.ok) {
          fail({ step: "save", name: "Servidor", message: saved.message });
          return;
        }
      } catch (err) {
        fail(toFailure("save", err));
        return;
      }
      setFailure(null);
      setSubscription(sub);
      setState("on");
      toast.success("Notificações ativadas neste aparelho");
    });

  const deactivate = () =>
    start(async () => {
      if (subscription) {
        await removePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe().catch(() => false);
      }
      setSubscription(null);
      setState("off");
      toast.success("Notificações desativadas neste aparelho");
    });

  const test = () =>
    start(async () => {
      const result = await sendTestPushAction();
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });

  const on = state === "on";
  return (
    <section
      aria-label="Notificações no celular"
      className={cn("glass-panel flex items-start gap-3 rounded-[20px] p-4", className)}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-[12px]",
          on ? "bg-gold-soft text-gold" : "glass-inner text-muted-foreground",
        )}
      >
        {on ? <BellRingIcon className="size-5" aria-hidden /> : <BellOffIcon className="size-5" aria-hidden />}
      </span>
      <div className="grid min-w-0 flex-1 gap-2.5">
        <div>
          <p className="text-[0.9375rem] leading-snug font-extrabold tracking-[-0.02em]">
            {on ? "Notificações ligadas" : "Notificações no celular"}
          </p>
          <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{TEXT[state]}</p>
        </div>
        {state === "off" && failure && (
          <div role="alert" className="rounded-[12px] border border-destructive/35 bg-destructive/10 px-3 py-2.5">
            <p className="text-[0.8125rem] font-bold text-destructive">Não ativou neste aparelho</p>
            <p className="mt-0.5 text-[0.8125rem] text-foreground">{pushFailureHelp(failure, { brave })}</p>
            <p className="mt-1.5 font-mono text-[0.6875rem] break-words text-muted-foreground">
              {pushFailureDetail(failure)}
            </p>
          </div>
        )}
        {state === "off" && brave && !failure && (
          <p className="text-[0.8125rem] text-muted-foreground">
            <strong className="font-bold text-foreground">Usa o Brave?</strong> Antes de ativar, abra o {BRAVE_PUSH_PATH}.
          </p>
        )}
        {state === "off" && (
          <Button size="sm" variant="gold" className="w-fit" onClick={activate} disabled={pending}>
            <BellRingIcon /> {pending ? "Ativando…" : failure ? "Tentar de novo" : "Ativar notificações"}
          </Button>
        )}
        {on && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={test} disabled={pending}>
              <SendIcon /> Enviar um teste
            </Button>
            <Button size="sm" variant="ghost" onClick={deactivate} disabled={pending}>
              Desativar
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
