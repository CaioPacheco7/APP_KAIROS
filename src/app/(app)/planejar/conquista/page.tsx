import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { GoalSimulator } from "@/components/planning/goal-simulator";
import { getMonthSnapshot } from "@/server/health";
import { getFormOptions } from "@/server/queries";

export const metadata = { title: "Conquistar algo · KAIROS" };

export default async function ConquistaPage() {
  await connection();
  const { today } = await getFormOptions();
  const snapshot = await getMonthSnapshot(today.slice(0, 7), today);

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <Link href="/planejar" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-4" /> Planejar
        </Link>
        <h1 className="text-2xl font-semibold">Conquistar algo</h1>
        <p className="text-sm text-muted-foreground">
          Diga o que você quer e quanto custa. Eu uso a sua renda e os seus gastos para mostrar caminhos possíveis.
        </p>
      </header>
      <GoalSimulator defaultIncome={snapshot.income} defaultExpenses={snapshot.committed} today={today} />
    </div>
  );
}
