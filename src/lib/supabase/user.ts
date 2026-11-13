import { redirect } from "next/navigation";
import { createClient } from "./server";

/**
 * Id do usuário logado (claim `sub` do JWT). Sem sessão, manda para /entrar.
 * A segurança real dos dados é a RLS do banco; isto só preenche `user_id`.
 */
export async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (!sub) redirect("/entrar");
  return sub;
}
