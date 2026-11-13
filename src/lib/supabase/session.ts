import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ONBOARDED_COOKIE } from "@/lib/onboarding";

/** Rotas acessíveis sem estar logado. */
const PUBLIC_PATHS = ["/entrar", "/auth"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Renova a sessão do Supabase a cada requisição, redireciona quem não está
 * logado para /entrar e quem ainda não fez a entrevista para /entrevista.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Não coloque código entre createServerClient e getClaims.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  /** Redireciona preservando os cookies de sessão que acabaram de ser renovados. */
  const redirectTo = (path: string, search = "") => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = search;
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!isLoggedIn && !isPublic(pathname)) return redirectTo("/entrar");
  if (isLoggedIn && pathname === "/entrar") return redirectTo("/dashboard");

  // Entrevista inicial obrigatória antes de usar o app.
  if (
    isLoggedIn &&
    !isPublic(pathname) &&
    !pathname.startsWith("/entrevista") &&
    !request.cookies.get(ONBOARDED_COOKIE)
  ) {
    return redirectTo("/entrevista/verificar", `?next=${encodeURIComponent(pathname)}`);
  }

  return response;
}
