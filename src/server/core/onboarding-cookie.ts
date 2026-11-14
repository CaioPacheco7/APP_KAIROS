import { cookies } from "next/headers";
import { ONBOARDED_COOKIE } from "@/lib/onboarding";

/** Marca este navegador como "entrevista concluída" (1 ano). Uso só no servidor. */
export async function setOnboardedCookie() {
  const store = await cookies();
  store.set(ONBOARDED_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}
