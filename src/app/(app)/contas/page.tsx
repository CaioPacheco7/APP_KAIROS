import {
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
import { Hourglass } from "@/components/brand/hourglass";
import { ConfirmButton } from "@/components/confirm-button";
import { Card, CardContent } from "@/components/ui/card";
import { formatBRL } from "@/lib/money";
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

export default async function ContasPage() {
  await connection();
  const [accounts, balances] = await Promise.all([getAccounts(), getBalances()]);

  const total = accounts.reduce((sum, a) => sum + (balances.get(a.id) ?? 0), 0);

  return (
    <div className="grid grid-cols-1 gap-8">
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
          <Card className="animate-rise relative" style={{ "--d": "60ms" } as React.CSSProperties}>
            <Hourglass className="pointer-events-none absolute -right-5 -bottom-10 h-56 text-gold-fill opacity-[0.055]" />
            <CardContent className="relative flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Saldo total</p>
                <p className="mt-2 font-display text-5xl leading-none tracking-normal tabular-nums sm:text-7xl">
                  {formatBRL(total)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {accounts.length} {accounts.length === 1 ? "conta ativa" : "contas ativas"}
              </p>
            </CardContent>
          </Card>

          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account, i) => {
              const { icon, tone } = TYPE_STYLE[account.type];
              return (
                <li key={account.id} className="animate-rise" style={{ "--d": `${120 + i * 60}ms` } as React.CSSProperties}>
                  <Card className="h-full">
                    <CardContent className="grid h-full gap-6">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <IconChip icon={icon} tone={tone} className="size-11" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{account.name}</p>
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
                              className="text-muted-foreground"
                            >
                              Arquivar
                            </ConfirmButton>
                          </form>
                        </div>
                      </div>
                      <p className="mt-auto font-display text-5xl leading-none tracking-normal tabular-nums">
                        {formatBRL(balances.get(account.id) ?? 0)}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
