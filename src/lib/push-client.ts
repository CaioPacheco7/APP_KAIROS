/**
 * Notificações no navegador (lado do aparelho). Sem React: funções simples
 * para descobrir o estado, ativar e desativar.
 */

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

export async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
  } catch {
    return null;
  }
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

/** Pede a permissão e inscreve este aparelho. */
export async function subscribeThisDevice(): Promise<PushSubscription | "denied" | null> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : null;
  const reg = await registration();
  if (!reg) return null;
  await navigator.serviceWorker.ready;
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
}
