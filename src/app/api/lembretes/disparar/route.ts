import { createClient } from "@supabase/supabase-js";
import { pushReady, sendPush } from "@/server/core/web-push";

/**
 * Disparador dos lembretes. O Supabase (pg_cron) chama a cada minuto com o
 * segredo PUSH_SECRET; o banco devolve só o que venceu agora e ainda não foi
 * avisado (claim_due_reminders) e aqui cada aviso vai para os aparelhos.
 */
export async function POST(request: Request) {
  const secret = process.env.PUSH_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ erro: "não autorizado" }, { status: 401 });
  }
  if (!pushReady()) {
    return Response.json({ erro: "chaves das notificações não cadastradas" }, { status: 503 });
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.rpc("claim_due_reminders", { p_secret: secret });
  if (error) {
    console.error("[lembretes] claim_due_reminders falhou:", error.code, error.message);
    return Response.json({ erro: "banco" }, { status: 500 });
  }

  type Row = { task_id: string; endpoint: string; p256dh: string; auth: string; title: string; body: string; url: string };
  let sent = 0;
  let removed = 0;
  for (const row of (Array.isArray(data) ? data : []) as Row[]) {
    const result = await sendPush(row, { title: row.title, body: row.body, url: row.url, tag: `lembrete-${row.task_id}` });
    if (result === "ok") sent++;
    if (result === "gone") {
      await db.rpc("drop_push_subscription", { p_secret: secret, p_endpoint: row.endpoint });
      removed++;
    }
  }
  return Response.json({ enviados: sent, removidos: removed });
}
