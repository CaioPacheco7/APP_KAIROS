import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setOnboardedCookie } from "@/server/core/onboarding-cookie";

/** Só aceita caminhos internos ("/algo"), nunca endereços externos. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

/**
 * O proxy manda para cá quem está logado mas sem o cookie de "entrevista
 * concluída" (navegador novo, cookie apagado). Se o banco diz que já
 * concluiu, repõe o cookie e segue; senão, leva para a entrevista.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .maybeSingle();

  if (data?.onboarded_at) {
    await setOnboardedCookie();
    return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/entrevista`);
}
