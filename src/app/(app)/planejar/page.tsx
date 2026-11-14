import { CheckCircle2Icon, FlagIcon, ShieldAlertIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { ConfirmButton } from "@/components/confirm-button";
import { ContributionDialog } from "@/components/planning/contribution-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatBRL } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { deleteGoalAction } from "@/server/goals";
import { getAccounts, getFormOptions } from "@/server/queries";
import type { Goal } from "@/types/database";

export const metadata = { title: "Planejar · KAIROS" };

export default async function PlanejarPage() {
  await connection();
  const db = await createClient();
  const [{ today }, accounts, goalsRes, progressRes] = await Promise.all([
    getFormOptions(),
    getAccounts(),
    db
      .from("goals")
      .select("id, kind, title, target_amount, monthly_amount, months_planned, rate_pct_month, status")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    db.from("v_goal_progress").select("goal_id, contributed"),
  ]);

  const goals = (goalsRes.data ?? []) as Goal[];
  const contributed = new Map(
    ((progressRes.data ?? []) as { goal_id: string; contributed: number }[]).map((p) => [
      p.goal_id,
      Number(p.contributed),
    ]),
  );
  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Planejar</h1>
        <p className="text-sm text-muted-foreground">
          Simule o caminho até uma conquista ou para sair de uma dívida, e acompanhe o progresso.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/planejar/conquista" className="group">
          <Card className="h-full transition-colors group-hover:bg-muted/40">
            <CardContent className="grid gap-2">
              <FlagIcon className="size-5 text-muted-foreground" aria-hidden />
              <h2 className="font-medium">Conquistar algo</h2>
              <p className="text-sm text-muted-foreground">
                Uma moto, uma viagem, uma reserva. Veja em quanto tempo você chega lá com o que sobra do mês.
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/planejar/divida" className="group">
          <Card className="h-full transition-colors group-hover:bg-muted/40">
            <CardContent className="grid gap-2">
              <ShieldAlertIcon className="size-5 text-muted-foreground" aria-hidden />
              <h2 className="font-medium">Sair de uma dívida</h2>
              <p className="text-sm text-muted-foreground">
                Cartão, empréstimo, atraso. Compare parcelamentos e veja o que cabe no seu orçamento.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <section className="grid gap-3">
        <h2 className="text-lg font-medium">Meus planos</h2>
        {goals.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum plano ainda. Escolha um dos caminhos acima para simular e salvar o seu primeiro.
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {goals.map((goal) => {
              const done = Number(contributed.get(goal.id) ?? 0);
              const target = Number(goal.target_amount);
              const monthly = Number(goal.monthly_amount);
              const left = Math.max(target - done, 0);
              const pct = Math.min((done / target) * 100, 100);
              const finished = goal.status === "done" || left === 0;
              const monthsLeft = monthly > 0 ? Math.ceil(left / monthly) : null;
              const isDebt = goal.kind === "debt";

              return (
                <li key={goal.id}>
                  <Card>
                    <CardContent className="grid gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{goal.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {isDebt ? "Dívida" : "Meta"} · {formatBRL(monthly)} por mês
                            {goal.months_planned ? ` · ${goal.months_planned} meses` : ""}
                          </p>
                        </div>
                        {finished ? (
                          <Badge className="gap-1">
                            <CheckCircle2Icon /> Concluído
                          </Badge>
                        ) : (
                          <Badge variant="outline">{isDebt ? "Quitando" : "Guardando"}</Badge>
                        )}
                      </div>

                      <div className="grid gap-1.5">
                        <div className="h-2 rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso de ${goal.title}`}>
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(pct, done > 0 ? 2 : 0)}%` }} />
                        </div>
                        <div className="flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground tabular-nums">
                          <span>
                            {formatBRL(done)} de {formatBRL(target)} ({Math.round(pct)}%)
                          </span>
                          <span>
                            {finished
                              ? "Plano concluído"
                              : `Faltam ${formatBRL(left)}${monthsLeft ? ` · ~${monthsLeft} ${monthsLeft === 1 ? "mês" : "meses"}` : ""}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {!finished ? (
                          <ContributionDialog
                            goal={{ id: goal.id, title: goal.title, kind: goal.kind, monthly }}
                            accounts={accountOptions}
                            today={today}
                          />
                        ) : (
                          <span />
                        )}
                        <form action={deleteGoalAction}>
                          <input type="hidden" name="id" value={goal.id} />
                          <ConfirmButton
                            message={`Excluir o plano "${goal.title}"? O histórico de aportes dele some das telas.`}
                            variant="ghost"
                            size="sm"
                          >
                            Excluir
                          </ConfirmButton>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
