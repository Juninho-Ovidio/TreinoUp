import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/cadastro", "/recuperar-senha", "/auth", "/boas-vindas"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Renova a sessão em cada requisição e protege as rotas do app. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Não coloque código entre a criação do cliente e getClaims(): é ele que renova o token.
  // getClaims valida a assinatura do JWT localmente (chaves ES256 do projeto), sem ida ao servidor
  // de autenticação a cada navegação. Os dados continuam protegidos pelo RLS no banco.
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims?.sub ? claimsData.claims : null;

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname) && !pathname.startsWith("/api/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/boas-vindas" : "/login";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return withCookies(NextResponse.redirect(url), response);
  }

  if (user && (pathname === "/login" || pathname === "/cadastro" || pathname === "/boas-vindas")) {
    const url = request.nextUrl.clone();
    url.pathname = "/inicio";
    url.search = "";
    return withCookies(NextResponse.redirect(url), response);
  }

  return response;
}

/** Copia os cookies de sessão renovados para uma resposta de redirecionamento. */
function withCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((c) => target.cookies.set(c));
  return target;
}
