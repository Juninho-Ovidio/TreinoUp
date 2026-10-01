"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { saveExternal, searchExternal, searchLocal } from "@/data/foods";
import { errorMessage } from "@/data/base";
import type { AnyFood, Food } from "@/lib/types";
import { fmt, parseNum } from "@/lib/format";
import { macrosForGrams } from "@/lib/nutrition";
import { SOURCE_LABEL } from "./AddFoodSheet";

/** Escolher um alimento e a quantidade em gramas (para receitas). */
export function IngredientPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (food: Food, grams: number) => void }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AnyFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [chosen, setChosen] = useState<AnyFood | null>(null);
  const [grams, setGrams] = useState("100");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
      setChosen(null);
    }
  }, [open]);

  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const local = await searchLocal(t, 15);
        if (ctrl.signal.aborted) return;
        setResults(local);
        if (t.length >= 3) {
          const ext = await searchExternal(t, ctrl.signal).catch(() => []);
          if (!ctrl.signal.aborted) {
            const seen = new Set(local.map((f) => f.external_id).filter(Boolean));
            setResults([...local, ...ext.filter((f) => !seen.has(f.external_id))]);
          }
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [q]);

  async function confirm() {
    if (!chosen) return;
    const g = parseNum(grams);
    if (!g || g <= 0 || g > 5000) return toast.error("Informe os gramas entre 1 e 5000.");
    setBusy(true);
    try {
      const food = await saveExternal(chosen);
      onPick(food, g);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={chosen ? chosen.name : "Adicionar ingrediente"}>
      {chosen ? (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-muted">Quantidade</span>
            <Input value={grams} onChange={(e) => setGrams(e.target.value)} inputMode="decimal" suffix="g" autoFocus />
          </label>
          <p className="text-sm text-muted">{fmt(macrosForGrams(chosen, parseNum(grams) ?? 0).kcal)} kcal</p>
          <div className="flex gap-3">
            <Button variant="secondary" block onClick={() => setChosen(null)}>
              Voltar
            </Button>
            <Button block onClick={confirm} loading={busy}>
              Adicionar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar alimento"
              autoFocus
              aria-label="Buscar alimento"
              className="h-12 w-full rounded-full border border-line bg-surface pl-12 pr-4 text-[16px] focus:border-brand focus:outline-none"
            />
            {loading && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" aria-label="Buscando" />}
          </label>
          <ul className="flex max-h-[50dvh] flex-col gap-1 overflow-y-auto">
            {results.map((f, i) => (
              <li key={("id" in f && f.id) || f.external_id || i}>
                <button
                  onClick={() => {
                    setChosen(f);
                    setGrams(String(f.serving_g ?? 100));
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{f.name}</span>
                    <span className="block truncate text-[13px] text-muted">{[f.brand, SOURCE_LABEL[f.source]].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold">{fmt(f.kcal_100g)} kcal/100 g</span>
                </button>
              </li>
            ))}
            {!loading && q.trim().length >= 2 && results.length === 0 && <li className="py-6 text-center text-sm text-muted">Nada encontrado. Cadastre o alimento em Meus alimentos.</li>}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
