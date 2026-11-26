import {
  ArrowRightIcon,
  CheckCircle2Icon,
  FlagIcon,
  ShieldCheckIcon,
  TargetIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { EmptyState } from "@/components/app/empty-state";
import { IconChip } from "@/components/app/icon-chip";
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
    <div className="grid grid-cols-1 gap-10">
      {/* Capa com foto + os dois caminhos sobrepostos */}
      <div className="grid">
        <section className="animate-rise relative overflow-hidden rounded-[24px] border border-rim shadow-card">
          <Image
            src="/photos/planejar-lago.jpg"
            alt=""
            fill
            loading="eager"
            sizes="(min-width: 1152px) 1152px, 100vw"
            className="object-cover [filter:sepia(.22)_saturate(.78)_brightness(.9)]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10" />
          <div className="relative max-w-2xl px-6 pt-10 pb-28 text-white sm:px-10 sm:pt-14 sm:pb-32">
            <p className="eyebrow mb-4 !text-[#e6cc90]">Finanças · Planejar</p>
            <h1 className="font-display text-5xl leading-[1.04] tracking-tight sm:text-6xl">
              Para onde você quer ir?
            </h1>
            <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-white/85">
              Simule o caminho até uma conquista ou para sair de uma dívida e acompanhe o seu progresso, mês a mês.
            </p>
          </div>
        </section>

        <div className="relative z-10 -mt-16 grid gap-4 px-4 sm:grid-cols-2 sm:px-8">
          <ChoiceCard
            href="/planejar/conquista"
            icon={FlagIcon}
            tone="gold"
            title="Conquistar algo"
            delay={120}
          >
            Uma moto, uma viagem, uma reserva. Veja em quanto tempo você chega lá com o que sobra do mês.
          </ChoiceCard>
          <ChoiceCard
            href="/planejar/divida"
            icon={ShieldCheckIcon}
            tone="sage"
            title="Sair de uma dívida"
            delay={180}
          >
            Cartão, empréstimo, atraso. Compare parcelamentos e veja o que cabe no seu orçamento.
          </ChoiceCard>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-5">
        <h2 className="font-display text-3xl tracking-tight">Meus planos</h2>
        {goals.length === 0 ? (
          <EmptyState icon={TargetIcon} title="Nenhum plano ainda">
            Escolha um dos caminhos acima, simule e salve o seu primeiro plano. Depois é só registrar os aportes.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {goals.map((goal, i) => {
              const done = Number(contributed.get(goal.id) ?? 0);
              const target = Number(goal.target_amount);
              const monthly = Number(goal.monthly_amount);
              const left = Math.max(target - done, 0);
              const pct = Math.min((done / target) * 100, 100);
              const finished = goal.status === "done" || left === 0;
              const monthsLeft = monthly > 0 ? Math.ceil(left / monthly) : null;
              const isDebt = goal.kind === "debt";

              return (
                <li key={goal.id} className="animate-rise" style={{ "--d": `${i * 60}ms` } as React.CSSProperties}>
                  <Card className="h-full">
                    <CardContent className="grid grid-cols-1 gap-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <IconChip
                            icon={isDebt ? ShieldCheckIcon : FlagIcon}
                            tone={isDebt ? "sage" : "gold"}
                            className="size-11"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{goal.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {isDebt ? "Dívida" : "Meta"} · {formatBRL(monthly)} por mês
                              {goal.months_planned ? ` · ${goal.months_planned} meses` : ""}
                            </p>
                          </div>
                        </div>
                        {finished ? (
                          <Badge variant="gold" className="gap-1">
                            <CheckCircle2Icon /> Concluído
                          </Badge>
                        ) : (
                          <Badge variant="outline">{isDebt ? "Quitando" : "Guardando"}</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-end justify-between gap-3">
                          <p className="font-display text-6xl leading-none tracking-normal tabular-nums">
                            {Math.round(pct)}
                            <span className="text-3xl text-muted-foreground">%</span>
                          </p>
                          <p className="pb-1 text-right text-xs text-muted-foreground tabular-nums">
                            {formatBRL(done)} de {formatBRL(target)}
                          </p>
                        </div>
                        <div
                          className="h-2.5 rounded-full bg-muted"
                          role="progressbar"
                          aria-valuenow={Math.round(pct)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Progresso de ${goal.title}`}
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-gold-fill/70 to-gold-fill"
                            style={{ width: `${Math.max(pct, done > 0 ? 2 : 0)}%` }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground tabular-nums">
                          {finished
                            ? "Plano concluído. Parabéns!"
                            : `Faltam ${formatBRL(left)}${monthsLeft ? ` · cerca de ${monthsLeft} ${monthsLeft === 1 ? "mês" : "meses"}` : ""}`}
                        </p>
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
                            className="text-muted-foreground"
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

function ChoiceCard({
  href,
  icon,
  tone,
  title,
  children,
  delay,
}: {
  href: string;
  icon: typeof FlagIcon;
  tone: "gold" | "sage";
  title: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <Link
      href={href}
      className="group animate-rise rounded-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
    >
      <Card className="h-full shadow-pop transition-all duration-300 group-hover:-translate-y-1 group-hover:border-gold-fill/50">
        <CardContent className="grid grid-cols-1 gap-4">
          <IconChip icon={icon} tone={tone} className="size-12 rounded-2xl" />
          <div>
            <h2 className="font-display text-3xl leading-tight tracking-tight">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
          </div>
          <span className="flex items-center gap-1.5 text-sm font-medium text-gold">
            Começar a simular
            <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
