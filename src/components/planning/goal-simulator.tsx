"use client";

import { InfoIcon, SlidersHorizontalIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/app/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { planGoal } from "@/lib/finance/planning";
import { centsToInput, formatBRL, parseMoneyToCents } from "@/lib/money";
import { ScenarioCard } from "./scenario-card";
import { SavePlanForm } from "./save-plan-form";

const num = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** Simulador de meta: "quero conquistar X; como chego lá?". */
export function GoalSimulator({
  defaultIncome,
  defaultExpenses,
  today,
}: {
  defaultIncome: number;
  defaultExpenses: number;
  today: string;
}) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [income, setIncome] = useState(defaultIncome > 0 ? centsToInput(defaultIncome) : "");
  const [expenses, setExpenses] = useState(defaultExpenses > 0 ? centsToInput(defaultExpenses) : "");
  const [months, setMonths] = useState("");
  const [returnPct, setReturnPct] = useState("");

  const targetCents = parseMoneyToCents(target) ?? 0;
  const savedCents = parseMoneyToCents(saved) ?? 0;
  const incomeCents = parseMoneyToCents(income) ?? 0;
  const expensesCents = parseMoneyToCents(expenses) ?? 0;
  const monthsNum = num(months);
  const desiredMonths = monthsNum && Number.isInteger(monthsNum) && monthsNum > 0 ? monthsNum : null;

  const ready = targetCents > 0 && incomeCents > 0;
  const plan = useMemo(
    () =>
      ready
        ? planGoal({
            target: targetCents,
            saved: savedCents,
            income: incomeCents,
            expenses: expensesCents,
            desiredMonths,
            monthlyReturnPct: num(returnPct),
          })
        : null,
    [ready, targetCents, savedCents, incomeCents, expensesCents, desiredMonths, returnPct],
  );

  const finish = (n: number | null) =>
    n === null ? "—" : n === 0 ? "agora" : monthLabel(shiftMonth(today.slice(0, 7), n));

  return (
    <div className="grid grid-cols-1 gap-8">
      <Card>
        <CardContent className="grid grid-cols-1 gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="O que você quer conquistar?" htmlFor="gs-title">
              <Input id="gs-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Moto" maxLength={80} autoComplete="off" />
            </Field>
            <Field label="Quanto custa (R$)" htmlFor="gs-target">
              <Input id="gs-target" value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" placeholder="23000,00" autoComplete="off" />
            </Field>
            <Field label="Sua renda mensal (R$)" htmlFor="gs-income" hint="Preenchido com a renda do seu mês. Ajuste se quiser.">
              <Input id="gs-income" value={income} onChange={(e) => setIncome(e.target.value)} inputMode="decimal" placeholder="2500,00" autoComplete="off" />
            </Field>
            <Field label="Seus gastos por mês (R$)" htmlFor="gs-expenses" hint="Tudo que sai todo mês. Estimado do seu mês atual.">
              <Input id="gs-expenses" value={expenses} onChange={(e) => setExpenses(e.target.value)} inputMode="decimal" placeholder="1700,00" autoComplete="off" />
            </Field>
          </div>

          <details className="group rounded-xl border border-border bg-surface-2/50 px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium select-none">
              <SlidersHorizontalIcon className="size-4 text-gold" aria-hidden />
              Ajustes opcionais (entrada, prazo e rendimento)
            </summary>
            <div className="mt-4 grid gap-5 sm:grid-cols-3">
              <Field label="Já tem guardado? (R$)" htmlFor="gs-saved">
                <Input id="gs-saved" value={saved} onChange={(e) => setSaved(e.target.value)} inputMode="decimal" placeholder="0,00" autoComplete="off" />
              </Field>
              <Field label="Quer em quantos meses?" htmlFor="gs-months">
                <Input id="gs-months" value={months} onChange={(e) => setMonths(e.target.value)} inputMode="numeric" placeholder="Ex.: 24" autoComplete="off" />
              </Field>
              <Field label="Rendimento ao mês (%)" htmlFor="gs-return" hint="Deixe vazio para não contar rendimento.">
                <Input id="gs-return" value={returnPct} onChange={(e) => setReturnPct(e.target.value)} inputMode="decimal" placeholder="0" autoComplete="off" />
              </Field>
            </div>
          </details>
        </CardContent>
      </Card>

      {!plan ? (
        <EmptyState icon={SlidersHorizontalIcon} title="Quase lá">
          Preencha o valor e a sua renda para ver os caminhos possíveis.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Hoje sobra por mês</p>
              <p className="mt-1 font-display text-6xl leading-none tracking-normal tabular-nums">
                {formatBRL(plan.surplus)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground tabular-nums">
              {formatBRL(incomeCents)} de renda − {formatBRL(expensesCents)} de gastos
            </p>
          </div>

          {plan.warnings.length > 0 && (
            <ul className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
              {plan.warnings.map((w) => (
                <li key={w} className="flex gap-2.5">
                  <InfoIcon className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                  {w}
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {plan.scenarios.map((s) => (
              <ScenarioCard
                key={s.id}
                title={s.title}
                recommended={plan.recommendedId === s.id}
                feasible={s.feasible}
                highlight={{ label: "Guardar por mês", value: formatBRL(s.monthly) }}
                rows={[
                  ["Prazo", s.months === null ? "—" : `${s.months} ${s.months === 1 ? "mês" : "meses"}`],
                  ["Conquista em", finish(s.months)],
                  ["% da renda", `${Math.round(s.shareOfIncome)}%`],
                ]}
                note={s.note}
              >
                {s.feasible && s.months !== null && (
                  <SavePlanForm
                    kind="purchase"
                    defaultTitle={title.trim() || "Minha meta"}
                    target={targetCents}
                    monthly={s.monthly}
                    months={s.months}
                    ratePct={returnPct}
                    saved={savedCents}
                  />
                )}
              </ScenarioCard>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            É uma simulação com os números que você informou, não uma recomendação de investimento.
          </p>
        </div>
      )}
    </div>
  );
}
