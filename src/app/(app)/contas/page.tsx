import { connection } from "next/server";
import { AccountDialog } from "@/components/accounts/account-dialog";
import { ConfirmButton } from "@/components/confirm-button";
import { Card, CardContent } from "@/components/ui/card";
import { formatBRL } from "@/lib/money";
import { archiveAccountAction } from "@/server/accounts";
import { getAccounts, getBalances } from "@/server/queries";
import { ACCOUNT_TYPE_LABEL } from "@/types/database";

export const metadata = { title: "Contas · KAIROS" };

export default async function ContasPage() {
  await connection();
  const [accounts, balances] = await Promise.all([getAccounts(), getBalances()]);

  const total = accounts.reduce((sum, a) => sum + (balances.get(a.id) ?? 0), 0);

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Contas</h1>
          <p className="text-sm text-muted-foreground">
            Onde o seu dinheiro está. O saldo é calculado pelas transações.
          </p>
        </div>
        <AccountDialog />
      </header>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="grid gap-1 py-10 text-center">
            <p className="font-medium">Nenhuma conta ainda</p>
            <p className="text-sm text-muted-foreground">
              Crie a primeira e informe quanto você tem nela hoje. É o ponto de
              partida de todo o resto.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-muted-foreground">Saldo total</span>
              <span className="text-3xl font-semibold tabular-nums">
                {formatBRL(total)}
              </span>
            </CardContent>
          </Card>

          <ul className="grid gap-3 sm:grid-cols-2">
            {accounts.map((account) => (
              <li key={account.id}>
                <Card>
                  <CardContent className="grid gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ACCOUNT_TYPE_LABEL[account.type]}
                        </p>
                      </div>
                      <div className="flex items-center">
                        <AccountDialog account={account} />
                        <form action={archiveAccountAction}>
                          <input type="hidden" name="id" value={account.id} />
                          <ConfirmButton
                            message={`Arquivar "${account.name}"? Ela some das telas, mas o histórico de transações é mantido.`}
                            variant="ghost"
                            size="sm"
                          >
                            Arquivar
                          </ConfirmButton>
                        </form>
                      </div>
                    </div>
                    <p className="text-2xl font-semibold tabular-nums">
                      {formatBRL(balances.get(account.id) ?? 0)}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
