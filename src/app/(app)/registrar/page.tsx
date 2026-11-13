import { connection } from "next/server";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ScrollToBottom } from "@/components/chat/scroll-to-bottom";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { undoChatMessageAction } from "@/server/chat";
import { getAccounts } from "@/server/queries";
import { cn } from "@/lib/utils";

export const metadata = { title: "Registrar · KAIROS" };

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  entity_type: string | null;
  entity_id: string | null;
  undone_at: string | null;
};

const EXAMPLES = [
  "hoje tomei um café na padaria R$ 50",
  "recebi 3000 de salário",
  "uber 23,90 ontem",
  "tarefa: renovar CNH até 20/12",
  "lembrar de pagar a luz amanhã 9h",
  "anotar: ideia de presente para a Ana",
];

export default async function RegistrarPage() {
  await connection();
  const db = await createClient();
  const [accounts, { data }] = await Promise.all([
    getAccounts(),
    db
      .from("chat_messages")
      .select("id, role, content, entity_type, entity_id, undone_at")
      .order("created_at", { ascending: false })
      .limit(60),
  ]);
  const messages = ((data ?? []) as Message[]).reverse();

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <header>
        <h1 className="text-2xl font-semibold">Registrar</h1>
        <p className="text-sm text-muted-foreground">
          Escreva do jeito que você fala. O KAIROS entende o valor, a data e a
          categoria, e salva.
        </p>
      </header>

      {accounts.length === 0 && (
        <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          Para lançar gastos e receitas, crie uma conta primeiro (e informe o
          saldo inicial) na aba Contas. Tarefas, lembretes e notas já funcionam.
        </p>
      )}

      <div
        className="flex h-[55vh] flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-card/40 p-4"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="m-auto grid max-w-sm gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Experimente escrever algo como:
            </p>
            <ul className="grid gap-1.5 text-sm">
              {EXAMPLES.map((example) => (
                <li key={example} className="rounded-lg bg-muted px-3 py-1.5">
                  {example}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex max-w-[85%] flex-col gap-1 rounded-2xl px-3.5 py-2 text-sm",
                m.role === "user"
                  ? "self-end bg-primary text-primary-foreground"
                  : "self-start bg-muted",
              )}
            >
              <p className={cn(m.undone_at && "line-through opacity-60")}>
                {m.content}
              </p>
              {m.role === "assistant" && m.entity_id && (
                m.undone_at ? (
                  <span className="text-xs text-muted-foreground">Desfeito</span>
                ) : (
                  <form action={undoChatMessageAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <Button type="submit" variant="ghost" size="xs" className="-ml-1.5 h-5 px-1.5 text-muted-foreground">
                      Desfazer
                    </Button>
                  </form>
                )
              )}
            </div>
          ))
        )}
        <ScrollToBottom dependency={messages.length} />
      </div>

      <ChatComposer accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} />
    </div>
  );
}
