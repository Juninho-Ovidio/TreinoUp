"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PlayCircle, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, SectionTitle, Skeleton } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/Confirm";
import { ExercisePicker } from "@/components/app/ExercisePicker";
import { ExerciseSheet } from "@/components/app/ExerciseSheet";
import { invalidate, useQuery } from "@/hooks/useQuery";
import { keys } from "@/hooks/useDay";
import { deleteWorkout, getWorkout, lastLoads, listExercises, saveWorkout } from "@/data/workouts";
import { errorMessage } from "@/data/base";
import { today } from "@/lib/dates";
import { fmt, parseNum } from "@/lib/format";
import { workoutVolume } from "@/lib/exercise";
import type { Exercise } from "@/lib/types";

interface Row {
  key: string;
  exercise_id: string | null;
  name: string;
  sets: string;
  reps: string;
  load: string;
  rest: string;
}

export function WorkoutEditor({ id }: { id?: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(!!id);
  const [date, setDate] = useState(today());
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const catalog = useQuery("exercises", listExercises);
  const [viewing, setViewing] = useState<Exercise | null>(null);
  const openVideo = (r: Row) => {
    const list = catalog.data ?? [];
    setViewing(list.find((e) => e.id === r.exercise_id) ?? list.find((e) => e.name === r.name) ?? null);
  };
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loads, setLoads] = useState<Map<string, { sets: number; reps: number; load_kg: number }>>(new Map());

  useEffect(() => {
    lastLoads().then(setLoads).catch(() => undefined);
    if (!id) return;
    getWorkout(id)
      .then((w) => {
        if (!w) return;
        setDate(w.workout_date);
        setName(w.name);
        setDuration(w.duration_min ? String(w.duration_min) : "");
        setNotes(w.notes ?? "");
        setRows(
          (w.workout_exercises ?? []).map((e) => ({
            key: e.id,
            exercise_id: e.exercise_id,
            name: e.name,
            sets: String(e.sets),
            reps: String(e.reps),
            load: String(e.load_kg).replace(".", ","),
            rest: e.rest_s != null ? String(e.rest_s) : "",
          })),
        );
      })
      .catch((e) => toast.error(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [id, toast]);

  const parsed = rows.map((r) => ({ sets: parseNum(r.sets) ?? 0, reps: parseNum(r.reps) ?? 0, load_kg: parseNum(r.load) ?? 0 }));
  const update = (key: string, patch: Partial<Row>) => setRows((l) => l.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function save() {
    if (!name.trim()) return toast.error("Dê um nome ao treino (ex.: Treino A — Peito).");
    if (!rows.length) return toast.error("Adicione pelo menos um exercício.");
    for (const [i, r] of rows.entries()) {
      const p = parsed[i];
      if (p.sets < 1 || p.sets > 20 || p.reps < 1 || p.reps > 200) return toast.error(`${r.name}: séries entre 1 e 20 e repetições entre 1 e 200.`);
      if (p.load_kg < 0) return toast.error(`${r.name}: a carga não pode ser negativa.`);
    }
    const dur = parseNum(duration);
    setBusy(true);
    try {
      const w = await saveWorkout(
        {
          workout_date: date,
          name: name.trim(),
          duration_min: dur ? Math.round(dur) : null,
          notes: notes.trim() || null,
          exercises: rows.map((r, i) => ({
            exercise_id: r.exercise_id,
            name: r.name,
            sets: Math.round(parsed[i].sets),
            reps: Math.round(parsed[i].reps),
            load_kg: parsed[i].load_kg,
            rest_s: parseNum(r.rest) != null ? Math.round(parseNum(r.rest)!) : null,
          })),
        },
        id,
      );
      invalidate(keys.workouts, keys.charts);
      toast.success(id ? "Treino atualizado." : "Treino salvo no histórico.");
      router.replace(id ? `/treinos/${w.id}` : "/treinos");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!id || !(await confirm({ title: "Excluir treino?", confirmLabel: "Excluir", danger: true }))) return;
    try {
      await deleteWorkout(id);
      invalidate(keys.workouts, keys.charts);
      router.replace("/treinos");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  if (loading) {
    return (
      <main className="flex flex-col gap-4">
        <PageHeader title="Treino" back />
        <Skeleton className="h-40 rounded-[var(--radius-card)]" />
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-4">
      <PageHeader title={id ? "Treino" : "Novo treino"} back />

      <Card className="flex flex-col gap-4">
        <Field label="Nome">{(fid) => <Input id={fid} value={name} onChange={(e) => setName(e.target.value)} placeholder="Treino A — Peito e tríceps" />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">{(fid) => <Input id={fid} type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />}</Field>
          <Field label="Duração">{(fid) => <Input id={fid} value={duration} onChange={(e) => setDuration(e.target.value)} inputMode="numeric" suffix="min" />}</Field>
        </div>
      </Card>

      <SectionTitle action={<span className="text-sm text-muted">Volume: {fmt(workoutVolume(parsed))} kg</span>}>Exercícios</SectionTitle>

      {rows.map((r, i) => {
        const last = loads.get(r.name);
        return (
          <Card key={r.key} className="flex flex-col gap-3 animate-enter">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <button onClick={() => openVideo(r)} className="flex items-center gap-1.5 text-left font-bold" aria-label={`Ver como fazer: ${r.name}`}>
                  {r.name}
                  <PlayCircle className="h-5 w-5 shrink-0 text-brand-strong" aria-hidden />
                </button>
                {last && !id && (
                  <p className="text-[12px] text-muted">
                    Última vez: {last.sets}×{last.reps} com {fmt(last.load_kg)} kg
                  </p>
                )}
              </div>
              <button onClick={() => setRows((l) => l.filter((x) => x.key !== r.key))} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-danger" aria-label={`Remover ${r.name}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Mini label="Séries" value={r.sets} onChange={(v) => update(r.key, { sets: v })} />
              <Mini label="Reps" value={r.reps} onChange={(v) => update(r.key, { reps: v })} />
              <Mini label="Carga kg" value={r.load} onChange={(v) => update(r.key, { load: v })} decimal />
              <Mini label="Descanso s" value={r.rest} onChange={(v) => update(r.key, { rest: v })} />
            </div>
            <p className="sr-only">Exercício {i + 1} de {rows.length}</p>
          </Card>
        );
      })}

      <ExerciseSheet exercise={viewing} onClose={() => setViewing(null)} />

      <Button variant="secondary" size="lg" onClick={() => setPicker(true)}>
        <Plus className="h-4 w-4" /> Adicionar exercício
      </Button>

      <Field label="Observações (opcional)">
        {(fid) => <textarea id={fid} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-[16px] focus:border-brand focus:outline-none" />}
      </Field>

      <Button size="lg" block onClick={save} loading={busy}>
        {id ? "Salvar alterações" : "Salvar treino"}
      </Button>
      {id && (
        <Button variant="ghost" onClick={remove} className="text-danger">
          Excluir treino
        </Button>
      )}

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(e) => {
          const last = loads.get(e.name);
          setRows((l) => [
            ...l,
            {
              key: `${e.id}-${Date.now()}`,
              exercise_id: e.id,
              name: e.name,
              sets: String(last?.sets ?? 3),
              reps: String(last?.reps ?? 10),
              load: last ? String(last.load_kg).replace(".", ",") : "",
              rest: "60",
            },
          ]);
        }}
      />
    </main>
  );
}

function Mini({ label, value, onChange, decimal }: { label: string; value: string; onChange: (v: string) => void; decimal?: boolean }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-[11px] font-semibold text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={decimal ? "decimal" : "numeric"}
        className="h-11 w-full min-w-0 rounded-xl border border-line bg-surface px-2 text-center text-[16px] font-bold focus:border-brand focus:outline-none"
      />
    </label>
  );
}
