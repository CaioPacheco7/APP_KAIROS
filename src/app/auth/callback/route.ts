import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clearOnboardedCookie } from "@/server/core/onboarding-cookie";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // quem entrou agora pode ser outra pessoa: a entrevista é conferida de novo no banco
      await clearOnboardedCookie();
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // Falha (inclui e-mail não autorizado, bloqueado pelo banco).
  return NextResponse.redirect(`${origin}/entrar?erro=1`);
}
