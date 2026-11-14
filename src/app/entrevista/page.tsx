import { connection } from "next/server";
import { redirect } from "next/navigation";
import { InterviewWizard } from "@/components/interview/interview-wizard";
import { todayISO } from "@/lib/dates";
import { getAccounts, getProfile } from "@/server/queries";

export default async function EntrevistaPage() {
  await connection();
  const profile = await getProfile();

  // Já concluiu em outro navegador: o handler repõe o cookie e segue.
  if (profile?.onboarded_at) redirect("/entrevista/verificar");

  const accounts = await getAccounts();

  return (
    <InterviewWizard
      defaultName={profile?.name ?? ""}
      hasAccounts={accounts.length > 0}
      today={todayISO()}
    />
  );
}
