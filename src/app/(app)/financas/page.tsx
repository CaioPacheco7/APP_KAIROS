import { redirect } from "next/navigation";

/**
 * Entrada do módulo Finanças. O proxy só deixa chegar aqui quem já fez a
 * entrevista (quem não fez é levado para /entrevista antes), então basta
 * seguir para o painel.
 */
export default function FinancasPage() {
  redirect("/dashboard");
}
