"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { PRIVACY_EVENT as EVENT, PRIVACY_KEY } from "@/lib/privacy";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const isHidden = () => document.documentElement.dataset.privacy === "on";

function setHidden(hidden: boolean) {
  if (hidden) document.documentElement.dataset.privacy = "on";
  else delete document.documentElement.dataset.privacy;
  try {
    if (hidden) localStorage.setItem(PRIVACY_KEY, "on");
    else localStorage.removeItem(PRIVACY_KEY);
  } catch {
    // navegação privada ou armazenamento bloqueado: vale só nesta aba
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Olho da barra do topo: esconde (embaça) os valores em reais em todo o app. */
export function PrivacyToggle({ className }: { className?: string }) {
  // false no servidor; no navegador lê o que o script do <head> já aplicou
  const hidden = useSyncExternalStore(subscribe, isHidden, () => false);
  const label = hidden ? "Mostrar valores" : "Ocultar valores";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={hidden}
      title={label}
      className={className}
      onClick={() => setHidden(!hidden)}
    >
      {hidden ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
    </button>
  );
}
