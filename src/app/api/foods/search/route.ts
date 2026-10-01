import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { providers } from "@/lib/foods";

/** Busca em bases externas. Exige login para evitar uso abusivo da API de terceiros. */
export async function GET(req: NextRequest) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return NextResponse.json({ error: "Faça login para buscar." }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 80) return NextResponse.json({ results: [] });

  for (const p of providers) {
    try {
      const results = await p.search(q, { pageSize: 20 });
      return NextResponse.json({ results, source: p.label }, { headers: { "Cache-Control": "private, max-age=300" } });
    } catch {
      // tenta a próxima base
    }
  }
  return NextResponse.json({ error: "A base de alimentos não respondeu. Tente de novo em instantes." }, { status: 502 });
}
