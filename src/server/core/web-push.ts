import webpush from "web-push";

/**
 * Envio de notificações (Web Push). As chaves VAPID ficam nas variáveis de
 * ambiente da Vercel: NEXT_PUBLIC_VAPID_PUBLIC_KEY (pública, também usada no
 * navegador) e VAPID_PRIVATE_KEY (secreta, só no servidor).
 */

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type PushMessage = { title: string; body: string; url: string; tag?: string };

let configured: boolean | null = null;

/** Liga o web-push com as chaves; false se elas ainda não foram cadastradas. */
export function pushReady(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://kairos-kappa-beryl.vercel.app", publicKey, privateKey);
  return (configured = true);
}

/** "ok" entregue · "gone" aparelho não existe mais (apagar) · "error" falhou agora. */
export async function sendPush(target: PushTarget, message: PushMessage): Promise<"ok" | "gone" | "error"> {
  if (!pushReady()) return "error";
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(message),
      { TTL: 60 * 30, urgency: "high" },
    );
    return "ok";
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("[push] falhou:", status, (err as Error).message);
    return "error";
  }
}
