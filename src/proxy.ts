import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Tudo, exceto arquivos estáticos, imagens e o manifesto do app (o celular
    // busca o manifesto sem estar logado para poder instalar).
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|brand/|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
