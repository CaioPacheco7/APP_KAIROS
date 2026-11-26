"use client";

import { ArrowLeftIcon, ArrowRightIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HealthSummary } from "@/components/health/health-card";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { assessHealth } from "@/lib/finance/health";
import { formatBRL, parseMoneyToCents } from "@/lib/money";
import { useServerForm } from "@/lib/use-server-form";
import { cn } from "@/lib/utils";
import { completeInterviewAction } from "@/server/interview";

type Fixed = { key: number; description: string; amount: string; day: string };
type StepId = "welcome" | "name" | "income" | "account" | "fixed" | "review";

const SUGGESTIONS = [
  "Aluguel",
  "Água",
  "Luz",
  "Internet",
  "Celular",
  "Alimentação",
  "Transporte",
  "Consórcio / parcela",
  "Plano de saúde",
  "Escola / faculdade",
];

export function InterviewWizard({
  defaultName,
  hasAccounts,
  today,
}: {
  defaultName: string;
  hasAccounts: boolean;
  today: string;
}) {
  const router = useRouter();
  const steps: StepId[] = hasAccounts
    ? ["welcome", "name", "income", "fixed", "review"]
    : ["welcome", "name", "income", "account", "fixed", "review"];

  const [index, setIndex] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [name, setName] = useState(defaultName.split(" ")[0] ?? "");
  const [income, setIncome] = useState("");
  const [incomeDay, setIncomeDay] = useState("5");
  const [accountName, setAccountName] = useState("Conta principal");
  const [balance, setBalance] = useState("");
  const [fixed, setFixed] = useState<Fixed[]>([]);
  const [nextKey, setNextKey] = useState(1);

  const { pending, onSubmit, formError, fieldError } = useServerForm(
    completeInterviewAction,
    () => router.replace("/dashboard"),
  );

  const step = steps[index];
  const isLast = index === steps.length - 1;

  const incomeCents = parseMoneyToCents(income);
  const fixedTotal = fixed.reduce(
    (sum, f) => sum + (parseMoneyToCents(f.amount) ?? 0),
    0,
  );

  function validate(): string | null {
    if (step === "name" && !name.trim()) return "Me diga como você quer ser chamado.";
    if (step === "income") {
      if (!incomeCents || incomeCents <= 0) return "Informe a sua renda mensal. Ex.: 2500,00";
      const day = Number(incomeDay);
      if (!Number.isInteger(day) || day < 1 || day > 31) return "O dia de recebimento vai de 1 a 31.";
    }
    if (step === "account") {
      if (!accountName.trim()) return "Dê um nome à conta.";
      if (balance.trim() && parseMoneyToCents(balance, { allowNegative: true }) === null) {
        return "Saldo inválido. Ex.: 1500,00";
      }
    }
    if (step === "fixed") {
      for (const f of fixed) {
        const amount = parseMoneyToCents(f.amount);
        const day = Number(f.day);
        if (!f.description.trim()) return "Toda conta precisa de um nome.";
        if (!amount || amount <= 0) return `Valor inválido em "${f.description || "conta"}".`;
        if (!Number.isInteger(day) || day < 1 || day > 31) return `Dia inválido em "${f.description}".`;
      }
    }
    return null;
  }

  function goNext() {
    const problem = validate();
    setStepError(problem);
    if (!problem) setIndex((i) => Math.min(i + 1, steps.length - 1));
  }

  function addFixed(description = "") {
    setFixed((rows) => [...rows, { key: nextKey, description, amount: "", day: "10" }]);
    setNextKey((k) => k + 1);
  }

  const update = (key: number, patch: Partial<Fixed>) =>
    setFixed((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // Prévia do semáforo com o que a pessoa acabou de informar
  const preview = assessHealth({
    income: incomeCents ?? 0,
    committed: fixedTotal,
    fixed: fixedTotal,
    variable: 0,
    month: today.slice(0, 7),
    today,
  });

  return (
    <form
      onSubmit={(event) => {
        // Enter nos passos do meio avança em vez de enviar.
        if (!isLast) {
          event.preventDefault();
          goNext();
          return;
        }
        onSubmit(event);
      }}
      className="grid grid-cols-1 gap-6"
    >
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="income" value={income} />
      <input type="hidden" name="income_day" value={incomeDay} />
      {!hasAccounts && <input type="hidden" name="account_name" value={accountName} />}
      {!hasAccounts && <input type="hidden" name="balance" value={balance} />}
      <input
        type="hidden"
        name="fixed"
        value={JSON.stringify(
          fixed.map(({ description, amount, day }) => ({ description, amount, day })),
        )}
      />

      {/* Progresso */}
      <div className="grid grid-cols-1 gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {step === "welcome" ? "Bem-vindo" : `Passo ${index} de ${steps.length - 1}`}
          </span>
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {steps.slice(1).map((s, i) => (
            <span
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full bg-muted transition-colors duration-500",
                i < index && "bg-gold-fill",
              )}
            />
          ))}
        </div>
      </div>

      {step === "welcome" && (
        <div className="grid grid-cols-1 gap-5">
          <Image
            src="/brand/icone-card.png"
            alt=""
            width={72}
            height={72}
            className="lg:hidden"
            loading="eager"
          />
          <h1 className="text-[clamp(2rem,4vw,2.9rem)] leading-[1.04] font-extrabold tracking-[-0.055em]">Vamos começar a controlar seus <span className="text-gold">gastos</span></h1>
          <p className="text-sm text-muted-foreground">
            Para cuidar bem das suas finanças, preciso te conhecer um pouco.
            São poucas perguntas, leva cerca de 2 minutos: quanto você ganha,
            quanto tem hoje e quais contas se repetem todo mês. Depois eu monto o
            seu mês e aviso quando ele estiver saudável, em atenção ou em risco.
          </p>
          <p className="text-xs text-muted-foreground">
            Só quer usar a rotina por enquanto? Sem problema: você pode voltar
            ao início e responder isto quando quiser.
          </p>
        </div>
      )}

      {step === "name" && (
        <div className="grid grid-cols-1 gap-4">
          <h2 className="font-display text-4xl leading-tight tracking-tight">Como você quer ser chamado?</h2>
          <Field label="Seu nome" htmlFor="iv-name" error={fieldError("name")}>
            <Input
              id="iv-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              autoComplete="given-name"
              maxLength={60}
            />
          </Field>
        </div>
      )}

      {step === "income" && (
        <div className="grid grid-cols-1 gap-4">
          <h2 className="font-display text-4xl leading-tight tracking-tight">
            {name ? `${name}, ` : ""}quanto você ganha por mês?
          </h2>
          <p className="text-sm text-muted-foreground">
            O que realmente cai na sua conta (líquido, já com os descontos). Se
            varia, coloque uma média do que costuma receber.
          </p>
          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <Field label="Renda mensal (R$)" htmlFor="iv-income" error={fieldError("income")}>
              <Input
                id="iv-income"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                inputMode="decimal"
                placeholder="2500,00"
                autoFocus
                autoComplete="off"
              />
            </Field>
            <Field label="Dia que recebe" htmlFor="iv-day" error={fieldError("income_day")}>
              <Input
                id="iv-day"
                value={incomeDay}
                onChange={(e) => setIncomeDay(e.target.value)}
                inputMode="numeric"
                maxLength={2}
              />
            </Field>
          </div>
        </div>
      )}

      {step === "account" && (
        <div className="grid grid-cols-1 gap-4">
          <h2 className="font-display text-4xl leading-tight tracking-tight">Quanto você tem hoje?</h2>
          <p className="text-sm text-muted-foreground">
            Ponto de partida do seu saldo: o que você tem agora na conta
            principal (ou na carteira). Pode ser zero.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome da conta" htmlFor="iv-acc" error={fieldError("account_name")}>
              <Input
                id="iv-acc"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                autoComplete="off"
                maxLength={60}
              />
            </Field>
            <Field label="Saldo hoje (R$)" htmlFor="iv-bal" error={fieldError("balance")}>
              <Input
                id="iv-bal"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                autoFocus
                autoComplete="off"
              />
            </Field>
          </div>
        </div>
      )}

      {step === "fixed" && (
        <div className="grid grid-cols-1 gap-4">
          <h2 className="font-display text-4xl leading-tight tracking-tight">Quais contas se repetem todo mês?</h2>
          <p className="text-sm text-muted-foreground">
            Aluguel, água, luz, parcelas, mercado… Toque nas sugestões ou
            adicione as suas. Você pode ajustar tudo depois em “Meu mês”.
          </p>

          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addFixed(s)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                + {s}
              </button>
            ))}
          </div>

          {fixed.length > 0 && (
            <ul className="grid grid-cols-1 gap-2">
              {fixed.map((row) => (
                <li key={row.key} className="grid grid-cols-[1fr_6.5rem_3.5rem_auto] items-center gap-2">
                  <Input
                    value={row.description}
                    onChange={(e) => update(row.key, { description: e.target.value })}
                    placeholder="Nome"
                    aria-label="Nome da conta"
                    maxLength={60}
                    autoComplete="off"
                  />
                  <Input
                    value={row.amount}
                    onChange={(e) => update(row.key, { amount: e.target.value })}
                    placeholder="0,00"
                    aria-label="Valor"
                    inputMode="decimal"
                    autoComplete="off"
                  />
                  <Input
                    value={row.day}
                    onChange={(e) => update(row.key, { day: e.target.value })}
                    aria-label="Dia do vencimento"
                    inputMode="numeric"
                    maxLength={2}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remover ${row.description || "conta"}`}
                    onClick={() => setFixed((rows) => rows.filter((r) => r.key !== row.key))}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              ))}
              <li className="grid grid-cols-[1fr_6.5rem_3.5rem_auto] gap-2 text-xs text-muted-foreground" aria-hidden>
                <span>Conta</span>
                <span>Valor (R$)</span>
                <span>Dia</span>
                <span className="w-7" />
              </li>
            </ul>
          )}

          <Button type="button" variant="outline" onClick={() => addFixed()} className="w-fit">
            <PlusIcon /> Adicionar outra
          </Button>

          {fixed.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Total das contas fixas:{" "}
              <strong className="text-foreground">{formatBRL(fixedTotal)}</strong>
            </p>
          )}
        </div>
      )}

      {step === "review" && (
        <div className="grid grid-cols-1 gap-4">
          <h2 className="font-display text-4xl leading-tight tracking-tight">Seu mês, {name || "pronto"}</h2>
          <HealthSummary health={preview} />
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Renda</dt>
              <dd className="font-medium tabular-nums">{formatBRL(incomeCents ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Contas fixas</dt>
              <dd className="font-medium tabular-nums">{formatBRL(fixedTotal)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Sobra</dt>
              <dd className="font-medium tabular-nums">
                {formatBRL((incomeCents ?? 0) - fixedTotal)}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            As contas cujo vencimento já passou neste mês aparecem como
            atrasadas: marque “paguei” ou exclua. Os seus gastos do dia a dia
            você registra na aba Registrar.
          </p>
        </div>
      )}

      {(stepError || formError) && (
        <p role="alert" className="text-sm text-destructive">
          {stepError ?? formError}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        {index > 0 ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStepError(null);
              setIndex((i) => Math.max(i - 1, 0));
            }}
          >
            <ArrowLeftIcon /> Voltar
          </Button>
        ) : (
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>
            Agora não
          </Link>
        )}

        {isLast ? (
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Montando seu mês…" : "Começar a usar"}
          </Button>
        ) : (
          <Button type="button" size="lg" onClick={goNext}>
            {step === "welcome" ? "Vamos lá" : step === "fixed" && fixed.length === 0 ? "Pular" : "Continuar"}
            <ArrowRightIcon />
          </Button>
        )}
      </div>
    </form>
  );
}
