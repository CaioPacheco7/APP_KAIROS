import { MessagesSquareIcon, Undo2Icon } from "lucide-react";
import Image from "next/image";
import { connection } from "next/server";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ScrollToBottom } from "@/components/chat/scroll-to-bottom";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { undoChatMessageAction } from "@/server/chat";
import { getAccounts } from "@/server/queries";

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
    <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-6">
      <PageHeader
        eyebrow="Registro rápido"
        title="Escreva, eu organizo"
        description="Conte o que aconteceu do seu jeito. Eu entendo o valor, a data e a categoria e salvo para você. Também serve para tarefas, lembretes e notas."
      />

      {accounts.length === 0 && (
        <p className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Para lançar gastos e receitas, configure primeiro as suas finanças
          (aba Finanças). Tarefas, lembretes e notas já funcionam por aqui.
        </p>
      )}

      <div
        className="animate-rise flex h-[40vh] min-h-64 flex-col gap-4 sm:h-[52vh] sm:min-h-80 overflow-y-auto rounded-3xl border border-border bg-card/50 p-4 shadow-card sm:p-6"
        style={{ "--d": "80ms" } as React.CSSProperties}
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <EmptyState
            icon={MessagesSquareIcon}
            title="Comece escrevendo algo"
            className="m-auto w-full max-w-md border-0"
          >
            Toque em uma sugestão abaixo ou escreva do seu jeito.
          </EmptyState>
        ) : (
          messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-sm">
                {m.content}
              </div>
            ) : (
              <div key={m.id} className="flex max-w-[92%] items-end gap-2.5 self-start">
                <Image
                  src="/brand/icone-card.png"
                  alt=""
                  width={28}
                  height={28}
                  className="shrink-0"
                />
                <div className="grid gap-1.5 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 text-sm shadow-card">
                  <p className={cn(m.undone_at && "text-muted-foreground line-through")}>{m.content}</p>
                  {m.entity_id &&
                    (m.undone_at ? (
                      <span className="text-xs text-muted-foreground">Desfeito</span>
                    ) : (
                      <form action={undoChatMessageAction}>
                        <input type="hidden" name="id" value={m.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="xs"
                          className="-ml-2 text-muted-foreground"
                        >
                          <Undo2Icon /> Desfazer
                        </Button>
                      </form>
                    ))}
                </div>
              </div>
            ),
          )
        )}
        <ScrollToBottom dependency={messages.length} />
      </div>

      <ChatComposer
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        suggestions={EXAMPLES}
      />
    </div>
  );
}
