/**
 * Manifesto do app instalável (PWA): é o que faz o KAIROS aparecer na tela
 * inicial do celular com ícone próprio e abrir em tela cheia, sem a barra do
 * navegador. Puro e testável; `app/manifest.ts` só devolve este objeto.
 */
import type { MetadataRoute } from "next";

/** Cor do cartão do ícone: fundo da tela de abertura e da barra do sistema. */
export const APP_BACKGROUND = "#0c0b0c";

export const APP_SHORTCUTS = [
  { name: "Registrar", short_name: "Registrar", description: "Escreva um gasto, tarefa ou nota do seu jeito", url: "/registrar" },
  { name: "Meu mês", short_name: "Meu mês", description: "Contas do mês, orçamento e semáforo", url: "/mes" },
  { name: "Cartões", short_name: "Cartões", description: "Faturas e limite dos cartões", url: "/cartoes" },
  { name: "Hábitos de hoje", short_name: "Hábitos", description: "Marque o que você já fez hoje", url: "/rotina" },
] as const;

export function appManifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "KAIROS",
    short_name: "KAIROS",
    description: "Finanças, rotina e objetivos em um só lugar. O momento certo de decidir.",
    lang: "pt-BR",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: APP_BACKGROUND,
    theme_color: APP_BACKGROUND,
    categories: ["finance", "productivity", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: APP_SHORTCUTS.map((s) => ({
      ...s,
      icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    })),
  };
}

/**
 * Quando mostrar o convite para instalar (só no celular e fora do app já
 * instalado). "prompt" = o navegador oferece instalar com um botão (Android);
 * "ios" = no iPhone é pelo menu Compartilhar; "hidden" = não mostra.
 */
export type InstallMode = "prompt" | "ios" | "hidden";

export function installMode(input: {
  standalone: boolean;
  touch: boolean;
  dismissed: boolean;
  /** o navegador disparou `beforeinstallprompt` */
  canPrompt: boolean;
  userAgent: string;
}): InstallMode {
  if (input.standalone || input.dismissed || !input.touch) return "hidden";
  if (input.canPrompt) return "prompt";
  const ua = input.userAgent;
  const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && input.touch);
  // no iPhone só o Safari instala (outros navegadores no iOS 16.4+ também, pelo mesmo menu)
  if (iOS) return "ios";
  return "hidden";
}
