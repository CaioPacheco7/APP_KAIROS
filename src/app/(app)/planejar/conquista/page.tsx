import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { PageHeader } from "@/components/app/page-header";
import { GoalSimulator } from "@/components/planning/goal-simulator";
import { getMonthSnapshot } from "@/server/health";
import { getFormOptions } from "@/server/queries";

export const metadata = { title: "Conquistar algo · KAIROS" };

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
          title="Conquistar algo"
          description="Diga o que você quer e quanto custa. Eu uso a sua renda e os seus gastos para mostrar caminhos possíveis."
        />
      </div>
      <GoalSimulator defaultIncome={snapshot.income} defaultExpenses={snapshot.committed} today={today} />
    </div>
  );
}
