import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { providers } from "@/lib/foods";
import { normalizeBarcode } from "@/lib/foods/provider";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return NextResponse.json({ error: "Faça login para buscar." }, { status: 401 });

  const code = normalizeBarcode((await params).code);
  if (!code) return NextResponse.json({ error: "Código de barras inválido." }, { status: 400 });

  let failed = false;
  for (const p of providers) {
    try {
      const food = await p.byBarcode(code);
      if (food) return NextResponse.json({ food, source: p.label });
    } catch {
      failed = true;
    }
  }
  if (failed) return NextResponse.json({ error: "A base de alimentos não respondeu. Tente de novo em instantes." }, { status: 502 });
  return NextResponse.json({ food: null }, { status: 404 });
}
