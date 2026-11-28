/**
 * Notificações no navegador (lado do aparelho). Sem React: funções simples
 * para descobrir o estado, ativar e desativar.
 */

import { toFailure, type PushFailure } from "./push-errors";

export type PushState =
  | "checking"
  /** este navegador não recebe notificações */
  | "unsupported"
  /** iPhone/iPad fora do app instalado: precisa instalar pela tela inicial */
  | "needs-install"
  /** o servidor ainda não tem as chaves */
  | "no-server"
  /** a pessoa bloqueou nas configurações */
  | "denied"
  | "off"
  | "on";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** A chave pública VAPID (base64url) no formato que o navegador pede. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** O Brave deixa o push do Google desligado por padrão. */
export function isBrave(): boolean {
  return typeof (navigator as Navigator & { brave?: { isBrave?: unknown } }).brave?.isBrave === "function";
}

async function registerWorker(): Promise<ServiceWorkerRegistration> {
  return (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
}

export async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await registerWorker();
  } catch {
    return null;
  }
}

const WAIT_MS = 20_000;

/** Não deixa o botão preso em “Ativando…” se o navegador nunca responder. */
function within<T>(promise: Promise<T>, ms = WAIT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Object.assign(new Error(`sem resposta em ${ms / 1000} s`), { name: "TimeoutError" })),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export async function currentPushState(): Promise<{ state: PushState; subscription: PushSubscription | null }> {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return { state: isIOS() && !isStandalone() ? "needs-install" : "unsupported", subscription: null };
  if (!VAPID_PUBLIC_KEY) return { state: "no-server", subscription: null };
  if (Notification.permission === "denied") return { state: "denied", subscription: null };
  const reg = await registration();
  if (!reg) return { state: "unsupported", subscription: null };
  const subscription = await reg.pushManager.getSubscription();
  return { state: subscription && Notification.permission === "granted" ? "on" : "off", subscription };
}

export type SubscribeResult =
  | { status: "ok"; subscription: PushSubscription }
  /** bloqueou de vez */
  | { status: "denied" }
  /** fechou o pedido sem responder */
  | { status: "dismissed" }
  | { status: "failed"; failure: PushFailure };

/**
 * Pede a permissão e inscreve este aparelho. Nunca lança: diz em que etapa
 * falhou e com qual erro do navegador, para o cartão explicar.
 */
export async function subscribeThisDevice(): Promise<SubscribeResult> {
  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch (err) {
    return { status: "failed", failure: toFailure("permission", err) };
  }
  if (permission === "denied") return { status: "denied" };
  if (permission !== "granted") return { status: "dismissed" };

  let reg: ServiceWorkerRegistration;
  try {
    await registerWorker();
    reg = await within(navigator.serviceWorker.ready);
  } catch (err) {
    return { status: "failed", failure: toFailure("worker", err) };
  }

  const subscribe = () =>
    within(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
  try {
    return { status: "ok", subscription: await subscribe() };
  } catch (err) {
    if (toFailure("subscribe", err).name !== "InvalidStateError") {
      return { status: "failed", failure: toFailure("subscribe", err) };
    }
    // inscrição antiga presa (outra chave): apaga e tenta uma vez
    try {
      await (await reg.pushManager.getSubscription())?.unsubscribe();
      return { status: "ok", subscription: await subscribe() };
    } catch (retryErr) {
      return { status: "failed", failure: toFailure("subscribe", retryErr) };
    }
  }
}
