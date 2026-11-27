"use client";

import { ShareIcon, SmartphoneIcon, XIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { installMode, type InstallMode } from "@/lib/app-manifest";

/** Evento do Chrome/Android que permite oferecer "Instalar" com um botão. */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "kairos:instalar-dispensado";
const CHANGE = "kairos:install";
let deferred: InstallPromptEvent | null = null;

// O navegador pode oferecer a instalação antes desta tela montar: guarda já.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    window.dispatchEvent(new Event(CHANGE));
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    window.dispatchEvent(new Event(CHANGE));
  });
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  return () => window.removeEventListener(CHANGE, onChange);
}

function snapshot(): InstallMode {
  let dismissed = false;
  try {
    dismissed = localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // navegação privada: só não lembra que foi dispensado
  }
  const nav = navigator as Navigator & { standalone?: boolean };
  return installMode({
    standalone: matchMedia("(display-mode: standalone)").matches || nav.standalone === true,
    touch: matchMedia("(pointer: coarse)").matches,
    dismissed,
    canPrompt: deferred !== null,
    userAgent: navigator.userAgent,
  });
}

function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // sem armazenamento: some só nesta visita
  }
  deferred = null;
  window.dispatchEvent(new Event(CHANGE));
}

/**
 * Convite para instalar o KAIROS na tela inicial (só no celular, fora do app
 * instalado). Android: botão "Instalar". iPhone: o caminho pelo Compartilhar.
 */
export function InstallHint() {
  const mode = useSyncExternalStore(subscribe, snapshot, () => "hidden" as InstallMode);
  if (mode === "hidden") return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    deferred = null;
    window.dispatchEvent(new Event(CHANGE));
  }

  return (
    <aside
      aria-label="Instalar o app"
      className="glass-panel animate-rise relative flex items-start gap-3 rounded-[20px] p-4 pr-12"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-gold-soft text-gold">
        <SmartphoneIcon className="size-5" aria-hidden />
      </span>
      <div className="grid min-w-0 gap-2">
        <p className="text-[0.9375rem] leading-snug font-extrabold tracking-[-0.02em]">Instale o KAIROS no celular</p>
        {mode === "prompt" ? (
          <>
            <p className="text-[0.8125rem] text-muted-foreground">
              Fica na tela inicial com o ícone do KAIROS e abre em tela cheia, como um aplicativo.
            </p>
            <Button size="sm" variant="gold" className="w-fit" onClick={install}>
              Instalar
            </Button>
          </>
        ) : (
          <p className="text-[0.8125rem] text-muted-foreground">
            No Safari, toque em <ShareIcon className="inline size-4 align-[-3px] text-foreground" aria-label="Compartilhar" />{" "}
            <strong className="text-foreground">Compartilhar</strong> e depois em{" "}
            <strong className="text-foreground">Adicionar à Tela de Início</strong>. Ele abre em tela cheia, como um
            aplicativo.
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Agora não"
        title="Agora não"
        className="absolute top-2.5 right-2.5"
        onClick={dismiss}
      >
        <XIcon />
      </Button>
    </aside>
  );
}
