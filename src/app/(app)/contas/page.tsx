import {
  ArchiveIcon,
  LandmarkIcon,
  PiggyBankIcon,
  TrendingUpIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { connection } from "next/server";
import { AccountDialog } from "@/components/accounts/account-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { IconChip, type Tone } from "@/components/app/icon-chip";
import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/app/panel";
import { Hourglass } from "@/components/brand/hourglass";
import { ConfirmButton } from "@/components/confirm-button";
import { Count } from "@/components/viz/count";
import { formatBRL } from "@/lib/money";
import { accountColor, splitShares } from "@/lib/viz";
import { archiveAccountAction } from "@/server/accounts";
import { getAccounts, getBalances } from "@/server/queries";
import { ACCOUNT_TYPE_LABEL, type AccountType } from "@/types/database";

export const metadata = { title: "Contas · KAIROS" };

const TYPE_STYLE: Record<AccountType, { icon: LucideIcon; tone: Tone }> = {
  checking: { icon: LandmarkIcon, tone: "gold" },
  savings: { icon: PiggyBankIcon, tone: "sage" },
  wallet: { icon: WalletIcon, tone: "rose" },
  investment: { icon: TrendingUpIcon, tone: "sky" },
};

const pct = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export default async function ContasPage() {
  await connection();
  const [accounts, balances] = await Promise.all([getAccounts(), getBalances()]);

  const rows = accounts.map((a, i) => ({ ...a, balance: balances.get(a.id) ?? 0, color: accountColor(i) }));
  const total = rows.reduce((sum, r) => sum + r.balance, 0);
  const shares = splitShares(rows.map((r) => ({ key: r.id, label: r.name, value: r.balance, color: r.color })));
  const positiveTotal = shares.reduce((s, x) => s + x.value, 0);

  return (
    <div className="grid grid-cols-1 gap-5">
      <PageHeader
        eyebrow="Finanças"
        title="Contas"
        description="Onde o seu dinheiro está. O saldo é calculado pelas transações, então nunca fica desatualizado."
        actions={<AccountDialog />}
      />

      {accounts.length === 0 ? (
        <EmptyState icon={LandmarkIcon} title="Nenhuma conta ainda">
          Crie a primeira e informe quanto você tem nela hoje. É o ponto de partida de todo o resto.
        </EmptyState>
      ) : (
        <>
          {/* Saldo total + como ele se divide entre as contas */}
          <Panel
            title="Saldo total"
            subtitle={`${accounts.length} ${accounts.length === 1 ? "conta ativa" : "contas ativas"}`}
            className="animate-rise relative"
            action={<span className="rounded-[6px] bg-raised px-1.5 py-1 text-[0.625rem] font-extrabold">BRL</span>}
          >
            <Hourglass className="pointer-events-none absolute -right-5 -bottom-10 h-56 text-gold-fill opacity-[0.06]" />
            <p className="relative text-[clamp(2.6rem,5.2vw,4.4rem)] leading-[1.02] font-extrabold tracking-[-0.07em]">
              <Count value={total} />
            </p>
            {shares.length > 1 && (
              <div className="relative mt-4 grid gap-1.5">
                {/* barra fina de divisão: sem texto; nomes e valores estão nos cartões abaixo */}
                <div
                  role="img"
                  aria-label={`Divisão do saldo: ${shares
                    .map((s) => `${s.label} ${pct.format((s.value / positiveTotal) * 100)}%`)
                    .join(", ")}`}
                  className="animate-grow-x flex h-2 gap-[2px] overflow-hidden rounded-full"
                >
                  {shares.map((s) => (
                    <span key={s.key} className="h-full min-w-[3px]" style={{ flexGrow: s.value, flexBasis: 0, background: s.color }} />
                  ))}
                </div>
                <p className="text-[0.6875rem] text-muted-foreground">
                  Como o saldo se divide: cada cor é uma conta (o quadradinho ao lado do nome).
                </p>
              </div>
            )}
          </Panel>

          <ul className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((account) => {
              const { icon, tone } = TYPE_STYLE[account.type];
              const share = positiveTotal > 0 && account.balance > 0 ? (account.balance / positiveTotal) * 100 : null;
              return (
                <li key={account.id}>
                  <article className="glass-panel flex h-full min-w-0 flex-col gap-5 rounded-[20px] p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <IconChip icon={icon} tone={tone} className="size-10 rounded-[12px]" />
                        <div className="min-w-0">
                          <p className="flex min-w-0 items-center gap-1.5 font-bold">
                            <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ background: account.color }} />
                            <span className="truncate">{account.name}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABEL[account.type]}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center">
                        <AccountDialog account={account} />
                        <form action={archiveAccountAction}>
                          <input type="hidden" name="id" value={account.id} />
                          <ConfirmButton
                            message={`Arquivar "${account.name}"? Ela some das telas, mas o histórico de transações é mantido.`}
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground max-sm:px-2"
                          >
                            <ArchiveIcon className="sm:hidden" aria-hidden />
                            <span className="max-sm:sr-only">Arquivar</span>
                          </ConfirmButton>
                        </form>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <p className="text-[clamp(1.9rem,3.2vw,2.6rem)] leading-none font-extrabold tracking-[-0.06em]">
                        <Count value={account.balance} />
                      </p>
                      <p className="mt-1.5 text-[0.6875rem] font-semibold text-muted-foreground">
                        {share !== null
                          ? `${pct.format(share)}% do saldo`
                          : account.balance < 0
                            ? `Negativa em ${formatBRL(Math.abs(account.balance))}`
                            : "Sem saldo"}
                      </p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
