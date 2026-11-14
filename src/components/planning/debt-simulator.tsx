"use client";

import { useMemo, useState } from "react";
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
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
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
        <Field label="Juros da dívida ao mês, % (opcional)" htmlFor="ds-interest" hint="Pergunte ao banco. Sem isso, o custo real fica subestimado.">
          <Input id="ds-interest" value={interest} onChange={(e) => setInterest(e.target.value)} inputMode="decimal" placeholder="Ex.: 10" autoComplete="off" />
        </Field>
      </div>

      {!plan ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Preencha quanto você deve e a sua renda para ver os caminhos possíveis.
        </p>
      ) : (
        <div className="grid gap-4">
          <p className="text-sm">
            Depois dos essenciais, sobram <strong className="tabular-nums">{formatBRL(plan.surplus)}</strong> por
            mês para a dívida ({formatBRL(incomeCents)} − {formatBRL(essentialsCents)}).
          </p>

          <ul className="grid gap-1 rounded-lg border border-border bg-card/50 p-3 text-sm text-muted-foreground">
            {plan.warnings.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>

          <div className="grid gap-4 lg:grid-cols-3">
            {plan.options.map((o) => (
              <ScenarioCard
                key={o.id}
                title={o.title}
                recommended={plan.recommendedId === o.id}
                feasible={o.feasible}
                rows={[
                  [o.id === "sobra" ? "Pagar por mês" : "Parcela", formatBRL(o.payment)],
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
