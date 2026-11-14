import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/app/page-header";
import { DebtSimulator } from "@/components/planning/debt-simulator";
import { getMonthSnapshot } from "@/server/health";
import { getFormOptions } from "@/server/queries";

export const metadata = { title: "Sair de uma dívida · KAIROS" };

export default async function Page() {
  await connection();
  const { today } = await getFormOptions();
  const snapshot = await getMonthSnapshot(today.slice(0, 7), today);

  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="grid grid-cols-1 gap-5">
        <Link
          href="/planejar"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden /> Planejar
        </Link>
        <PageHeader
          eyebrow="Finanças · Planejar"
          title="Sair de uma dívida"
          description="Informe quanto você deve. Eu comparo parcelamentos e mostro o que cabe depois dos seus gastos essenciais."
        />
      </div>
      <DebtSimulator defaultIncome={snapshot.income} defaultEssentials={snapshot.fixed} today={today} />
    </div>
  );
}
