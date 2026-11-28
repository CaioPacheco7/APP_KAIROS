"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/supabase/user";
import { pushReady, sendPush } from "./core/web-push";

const subscriptionSchema = z.object({
  endpoint: z.url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

/** Guarda este aparelho para receber os lembretes (um por navegador/celular). */
export async function savePushSubscriptionAction(
  subscription: unknown,
  userAgent: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const parsed = subscriptionSchema.safeParse(subscription);
  if (!parsed.success) return { ok: false, message: "Não consegui ler a inscrição deste aparelho." };
  const userId = await requireUserId();
  const db = await createClient();
  const { error } = await db.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, message: "Não consegui ativar as notificações neste aparelho." };
  return { ok: true };
}

/** Para de avisar neste aparelho. */
export async function removePushSubscriptionAction(endpoint: string): Promise<void> {
  const db = await createClient();
  await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

/** Manda uma notificação de teste para os aparelhos da pessoa. */
export async function sendTestPushAction(): Promise<{ ok: boolean; message: string }> {
  if (!pushReady()) {
    return { ok: false, message: "As notificações ainda não foram ligadas no servidor." };
  }
  const db = await createClient();
  const { data } = await db.from("push_subscriptions").select("endpoint, p256dh, auth");
  const targets = (data ?? []) as { endpoint: string; p256dh: string; auth: string }[];
  if (targets.length === 0) return { ok: false, message: "Nenhum aparelho com notificações ativas." };
  let sent = 0;
  for (const t of targets) {
    const result = await sendPush(t, {
      title: "Notificações ligadas",
      body: "É assim que os seus lembretes vão chegar.",
      url: "/rotina?aba=lembretes",
      tag: "kairos-teste",
    });
    if (result === "ok") sent++;
    if (result === "gone") await db.from("push_subscriptions").delete().eq("endpoint", t.endpoint);
  }
  return sent > 0
    ? { ok: true, message: sent === 1 ? "Teste enviado. Deve chegar em segundos." : `Teste enviado para ${sent} aparelhos.` }
    : { ok: false, message: "Não consegui entregar o teste. Tente desativar e ativar de novo." };
}
