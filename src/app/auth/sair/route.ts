import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { clearOnboardedCookie } from "@/server/core/onboarding-cookie";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearOnboardedCookie();
  return NextResponse.redirect(new URL("/entrar", request.url), 303);
}
