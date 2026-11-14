import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { DebtSimulator } from "@/components/planning/debt-simulator";
import { getMonthSnapshot } from "@/server/health";
import { getFormOptions } from "@/server/queries";

export const metadata = { title: "Sair de uma dívida · KAIROS" };

export default async function DividaPage() {
  await connection();
  const { today } = await getFormOptions();
  const snapshot = await getMonthSnapshot(today.slice(0, 7), today);

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <Link href="/planejar" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" /> Planejar
        </Link>
        <h1 className="text-2xl font-semibold">Sair de uma dívida</h1>
        <p className="text-sm text-muted-foreground">
          Informe quanto você deve. Eu comparo parcelamentos e mostro o que cabe depois dos seus gastos essenciais.
        </p>
      </header>
      <DebtSimulator defaultIncome={snapshot.income} defaultEssentials={snapshot.fixed} today={today} />
    </div>
  );
}
