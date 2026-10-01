"use client";

import { useMemo, useState } from "react";
import { PlayCircle, Plus, Search } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { ExerciseSheet } from "./ExerciseSheet";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { invalidate, useQuery } from "@/hooks/useQuery";
import { createExercise, listExercises } from "@/data/workouts";
import { errorMessage } from "@/data/base";
import { CATEGORY_LABELS } from "@/lib/exercise";
import type { Exercise, ExerciseCategory } from "@/lib/types";
import { cn } from "@/lib/cn";

const CATS = Object.keys(CATEGORY_LABELS) as ExerciseCategory[];

/** Catálogo de exercícios por categoria, com descrição e opção de criar o próprio. */
export function ExercisePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick?: (e: Exercise) => void }) {
  const toast = useToast();
  const list = useQuery("exercises", listExercises);
  const [cat, setCat] = useState<ExerciseCategory | "all">("all");
  const [q, setQ] = useState("");
  const [viewing, setViewing] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState<ExerciseCategory>("chest");
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (list.data ?? []).filter((e) => (cat === "all" || e.category === cat) && (!t || e.name.toLowerCase().includes(t)));
  }, [list.data, cat, q]);

  async function create() {
    if (newName.trim().length < 2) return toast.error("Dê um nome ao exercício.");
    setBusy(true);
    try {
      const e = await createExercise({ name: newName.trim(), category: newCat, description: null });
      invalidate("exercises");
      setCreating(false);
      setNewName("");
      onPick?.(e);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Exercícios">
      {creating ? (
        <div className="flex flex-col gap-3">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do exercício" aria-label="Nome do exercício" autoFocus />
          <Select value={newCat} onChange={(e) => setNewCat(e.target.value as ExerciseCategory)} aria-label="Categoria">
            {CATS.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
          <div className="flex gap-3">
            <Button variant="secondary" block onClick={() => setCreating(false)}>
              Voltar
            </Button>
            <Button block onClick={create} loading={busy}>
              Criar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar exercício" aria-label="Buscar exercício" className="h-11 w-full rounded-full border border-line bg-surface pl-12 pr-4 text-[16px] focus:border-brand focus:outline-none" />
          </label>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            {(["all", ...CATS] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                aria-pressed={cat === c}
                className={cn("h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold", cat === c ? "bg-fg text-bg" : "bg-surface-2 text-fg")}
              >
                {c === "all" ? "Todos" : CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <ul className="flex max-h-[50dvh] flex-col gap-1 overflow-y-auto">
            {items.map((e) => (
              <li key={e.id} className="rounded-2xl hover:bg-surface-2">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  {/* Com onPick (montando um treino) tocar escolhe o exercício; sem onPick, abre o vídeo. */}
                  <button className="min-w-0 flex-1 text-left" onClick={() => (onPick ? (onPick(e), onClose()) : setViewing(e))}>
                    <span className="block truncate font-semibold">{e.name}</span>
                    <span className="block text-[12px] text-muted">{CATEGORY_LABELS[e.category]}</span>
                  </button>
                  <button
                    onClick={() => setViewing(e)}
                    className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", e.video_url ? "text-brand-strong" : "text-faint")}
                    aria-label={`Ver como fazer: ${e.name}`}
                  >
                    <PlayCircle className="h-6 w-6" />
                  </button>
                </div>
              </li>
            ))}
            {!list.loading && items.length === 0 && <li className="py-6 text-center text-sm text-muted">Nenhum exercício encontrado.</li>}
          </ul>
          <Button variant="secondary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Criar exercício
          </Button>
        </div>
      )}
      <ExerciseSheet exercise={viewing} onClose={() => setViewing(null)} />
    </Sheet>
  );
}
