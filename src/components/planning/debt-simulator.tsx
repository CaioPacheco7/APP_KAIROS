"use client";

import { InfoIcon, SlidersHorizontalIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/app/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { planDebt } from "@/lib/finance/planning";
import { centsToInput, formatBRL, parseMoneyToCents } from "@/lib/money";
import { ScenarioCard } from "./scenario-card";
import { SavePlanForm } from "./save-plan-form";

const num = (s: string): number | null => {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** Simulador de dívida: "estou devendo X; como saio dessa?". */
export function DebtSimulator({
  defaultIncome,
  defaultEssentials,
  today,
}: {
  defaultIncome: number;
  defaultEssentials: number;
  today: string;
}) {
  const [title, setTitle] = useState("");
  const [debt, setDebt] = useState("");
  const [income, setIncome] = useState(defaultIncome > 0 ? centsToInput(defaultIncome) : "");
  const [essentials, setEssentials] = useState(defaultEssentials > 0 ? centsToInput(defaultEssentials) : "");
  const [interest, setInterest] = useState("");

  const debtCents = parseMoneyToCents(debt) ?? 0;
  const incomeCents = parseMoneyToCents(income) ?? 0;
  const essentialsCents = parseMoneyToCents(essentials) ?? 0;
  const interestPct = num(interest);

  const ready = debtCents > 0 && incomeCents > 0;
  const plan = useMemo(
    () =>
      ready
        ? planDebt({
            debt: debtCents,
            income: incomeCents,
            essentials: essentialsCents,
            monthlyInterestPct: interestPct,
          })
        : null,
    [ready, debtCents, incomeCents, essentialsCents, interestPct],
  );

  return (
    <div className="grid grid-cols-1 gap-8">
      <Card>
        <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Que dívida é essa?" htmlFor="ds-title">
            <Input id="ds-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Cartão de crédito" maxLength={80} autoComplete="off" />
          </Field>
          <Field label="Quanto você deve (R$)" htmlFor="ds-debt">
            <Input id="ds-debt" value={debt} onChange={(e) => setDebt(e.target.value)} inputMode="decimal" placeholder="1900,00" autoComplete="off" />
          </Field>
          <Field label="Sua renda mensal (R$)" htmlFor="ds-income" hint="Preenchido com a renda do seu mês. Ajuste se quiser.">
            <Input id="ds-income" value={income} onChange={(e) => setIncome(e.target.value)} inputMode="decimal" placeholder="1500,00" autoComplete="off" />
          </Field>
          <Field label="Gastos essenciais por mês (R$)" htmlFor="ds-essentials" hint="Moradia, água, luz, comida, transporte. Estimado das suas contas fixas.">
            <Input id="ds-essentials" value={essentials} onChange={(e) => setEssentials(e.target.value)} inputMode="decimal" placeholder="900,00" autoComplete="off" />
          </Field>
          <Field label="Juros da dívida ao mês (%)" htmlFor="ds-interest" hint="Opcional. Pergunte ao banco: sem isso, o custo real fica subestimado." className="sm:col-span-2 sm:max-w-xs">
            <Input id="ds-interest" value={interest} onChange={(e) => setInterest(e.target.value)} inputMode="decimal" placeholder="Ex.: 10" autoComplete="off" />
          </Field>
        </CardContent>
      </Card>

      {!plan ? (
        <EmptyState icon={SlidersHorizontalIcon} title="Quase lá">
          Preencha quanto você deve e a sua renda para ver os caminhos possíveis.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Depois dos essenciais, sobra por mês</p>
              <p className="mt-1 font-display text-6xl leading-none tracking-normal tabular-nums">
                {formatBRL(plan.surplus)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground tabular-nums">
              {formatBRL(incomeCents)} de renda − {formatBRL(essentialsCents)} de essenciais
            </p>
          </div>

          <ul className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
            {plan.warnings.map((w) => (
              <li key={w} className="flex gap-2.5">
                <InfoIcon className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                {w}
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {plan.options.map((o) => (
              <ScenarioCard
                key={o.id}
                title={o.title}
                recommended={plan.recommendedId === o.id}
                feasible={o.feasible}
                highlight={{ label: o.id === "sobra" ? "Pagar por mês" : "Parcela mensal", value: formatBRL(o.payment) }}
                rows={[
                  ["Prazo", `${o.months} meses`],
                  ["Quita em", monthLabel(shiftMonth(today.slice(0, 7), o.months))],
                  ["Total pago", formatBRL(o.total)],
                  ["Juros pagos", interestPct === null ? "não informado" : formatBRL(o.interest)],
                ]}
                note={o.note}
              >
                {o.feasible && (
                  <SavePlanForm
                    kind="debt"
                    defaultTitle={title.trim() || "Minha dívida"}
                    target={o.total}
                    monthly={o.payment}
                    months={o.months}
                    ratePct={interest}
                  />
                )}
              </ScenarioCard>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            É uma simulação com os números que você informou. As condições reais (desconto, juros, prazo)
            dependem do que o credor oferecer: vale pedir mais de uma proposta.
          </p>
        </div>
      )}
    </div>
  );
}
