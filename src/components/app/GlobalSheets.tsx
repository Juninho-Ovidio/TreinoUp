"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Apple, Droplet, Dumbbell, Flame, Ruler, Salad, Scale, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Ring } from "@/components/ui/Progress";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "./AppProvider";
import { keys, useDay, useLatestWeight } from "@/hooks/useDay";
import { invalidate } from "@/hooks/useQuery";
import { addActivity, addWater, deleteWater } from "@/data/diary";
import { listWeights, saveWeight } from "@/data/body";
import { errorMessage } from "@/data/base";
import { today } from "@/lib/dates";
import { fmt1, fmtLiters, parseNum, signed } from "@/lib/format";
import { ACTIVITIES, estimateKcal } from "@/lib/exercise";
import type { ActivityKind } from "@/lib/types";
import { cn } from "@/lib/cn";

export function GlobalSheets() {
  const { sheet, openSheet } = useApp();
  const close = () => openSheet(null);
  return (
    <>
      <AddSheet open={sheet === "add"} onClose={close} />
      <WaterSheet open={sheet === "water"} onClose={close} />
      <WeightSheet open={sheet === "weight"} onClose={close} />
      <ActivitySheet open={sheet === "activity"} onClose={close} />
    </>
  );
}

// ---------- Menu "+" ----------

function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { openSheet } = useApp();
  const items = [
    { label: "Alimento", icon: Apple, color: "var(--brand)", go: () => router.push("/alimentos/buscar") },
    { label: "Receita", icon: Salad, color: "var(--carbs)", go: () => router.push("/receitas") },
    { label: "Água", icon: Droplet, color: "var(--water)", go: () => openSheet("water") },
    { label: "Peso", icon: Scale, color: "var(--protein)", go: () => openSheet("weight") },
    { label: "Treino", icon: Dumbbell, color: "var(--fat)", go: () => router.push("/treinos/novo") },
    { label: "Medidas", icon: Ruler, color: "var(--muted)", go: () => router.push("/progresso/medidas") },
    { label: "Exercício", icon: Flame, color: "var(--warn)", go: () => openSheet("activity") },
  ];
  return (
    <Sheet open={open} onClose={onClose} title="Adicionar">
      <div className="grid grid-cols-3 gap-3 pb-2 sm:grid-cols-4">
        {items.map((it, i) => (
          <button
            key={it.label}
            onClick={() => {
              if (!["Água", "Peso", "Exercício"].includes(it.label)) onClose();
              it.go();
            }}
            className="flex flex-col items-center gap-2 rounded-2xl bg-surface-2 px-2 py-4 text-sm font-semibold transition-transform active:scale-95 animate-enter"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-surface" style={{ color: it.color }}>
              <it.icon className="h-6 w-6" aria-hidden />
            </span>
            {it.label}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

// ---------- Água ----------

export function WaterSheet({ open, onClose, date = today() }: { open: boolean; onClose: () => void; date?: string }) {
  const toast = useToast();
  const day = useDay(date);
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState("");
  const goal = day.goal?.water_ml ?? 2500;

  async function add(ml: number) {
    if (!ml || ml <= 0 || ml > 5000) return toast.error("Informe uma quantidade entre 1 e 5000 ml.");
    setBusy(true);
    try {
      await addWater(date, ml);
      invalidate(keys.water(date), keys.charts);
      setCustom("");
      const total = day.waterMl + ml;
      if (day.waterMl < goal && total >= goal) toast.success("Meta de água atingida!");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteWater(id);
      invalidate(keys.water(date), keys.charts);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Água">
      <div className="flex flex-col items-center gap-5">
        <Ring value={day.waterMl} max={goal} size={168} stroke={14} color="var(--water)" label="Água consumida hoje">
          <div>
            <Droplet className="mx-auto mb-1 h-5 w-5 text-water" aria-hidden />
            <p className="text-2xl font-extrabold">{fmtLiters(day.waterMl)} L</p>
            <p className="text-sm text-muted">de {fmtLiters(goal)} L</p>
          </div>
        </Ring>
        <div className="grid w-full grid-cols-3 gap-2">
          {[250, 500, 750].map((ml) => (
            <Button key={ml} variant="secondary" size="lg" onClick={() => add(ml)} disabled={busy}>
              +{ml} ml
            </Button>
          ))}
        </div>
        <form
          className="flex w-full gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add(parseNum(custom) ?? 0);
          }}
        >
          <Input value={custom} onChange={(e) => setCustom(e.target.value)} inputMode="numeric" placeholder="Outra quantidade" suffix="ml" aria-label="Quantidade de água em ml" />
          <Button type="submit" disabled={busy || !custom}>
            Adicionar
          </Button>
        </form>
        {day.water.length > 0 && (
          <ul className="w-full divide-y divide-line text-sm">
            {[...day.water].reverse().slice(0, 6).map((w) => (
              <li key={w.id} className="flex items-center justify-between py-2">
                <span>
                  {w.amount_ml} ml <span className="text-muted">· {new Date(w.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                </span>
                <button onClick={() => remove(w.id)} className="rounded-full p-2 text-muted hover:text-danger" aria-label={`Remover ${w.amount_ml} ml`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}

// ---------- Peso ----------

function WeightSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const latest = useLatestWeight();
  const [date, setDate] = useState(today());
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ kg: number; diff: number | null } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const kg = parseNum(value);
    if (!kg || kg < 25 || kg > 400) return setError("Informe um peso entre 25 e 400 kg.");
    if (date > today()) return setError("A data não pode estar no futuro.");
    setError(null);
    setBusy(true);
    try {
      const before = (await listWeights(undefined, date)).filter((w) => w.entry_date < date).at(-1);
      await saveWeight(date, kg);
      invalidate(keys.latestWeight, keys.weights, keys.charts, "goal:");
      setResult({ kg, diff: before ? kg - before.weight_kg : null });
      setValue("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function closeAll() {
    setResult(null);
    setError(null);
    onClose();
  }

  return (
    <Sheet open={open} onClose={closeAll} title="Registrar peso">
      {result ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center animate-enter">
          <p className="text-5xl font-extrabold tracking-tight">{fmt1(result.kg)} kg</p>
          {result.diff != null && (
            <p className={cn("animate-pop rounded-full px-3 py-1 text-sm font-bold", result.diff <= 0 ? "bg-brand-soft text-brand-strong" : "bg-surface-2 text-fg")}>
              {signed(result.diff)} kg desde o registro anterior
            </p>
          )}
          <Button className="mt-4" block onClick={closeAll}>
            Pronto
          </Button>
        </div>
      ) : (
        <form onSubmit={save} className="flex flex-col gap-4">
          <Field label="Peso" error={error}>
            {(id, d) => (
              <Input
                id={id}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode="decimal"
                suffix="kg"
                placeholder={latest.data ? fmt1(latest.data.weight_kg) : "78,5"}
                autoFocus
                aria-describedby={d}
                invalid={!!error}
                className="h-16 text-2xl font-bold"
              />
            )}
          </Field>
          <Field label="Data">{(id) => <Input id={id} type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />}</Field>
          <Button type="submit" size="lg" block loading={busy}>
            Salvar peso
          </Button>
        </form>
      )}
    </Sheet>
  );
}

// ---------- Exercício (gasto calórico) ----------

export function ActivitySheet({ open, onClose, date = today() }: { open: boolean; onClose: () => void; date?: string }) {
  const toast = useToast();
  const latest = useLatestWeight();
  const [kind, setKind] = useState<ActivityKind>("walking");
  const [minutes, setMinutes] = useState("30");
  const [km, setKm] = useState("");
  const [busy, setBusy] = useState(false);
  const weight = latest.data?.weight_kg ?? 70;
  const min = parseNum(minutes) ?? 0;
  const dist = ACTIVITIES[kind].hasDistance ? parseNum(km) : null;
  const kcal = estimateKcal(kind, min, weight, dist);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (min < 1 || min > 600) return toast.error("Informe a duração entre 1 e 600 minutos.");
    setBusy(true);
    try {
      await addActivity({ entry_date: date, activity: kind, duration_min: Math.round(min), distance_km: dist ?? null, kcal });
      invalidate(keys.activities(date), keys.charts);
      toast.success(`${ACTIVITIES[kind].label} registrada: ${kcal} kcal`);
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Registrar exercício">
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Atividade">
          {(Object.keys(ACTIVITIES) as ActivityKind[]).map((k) => (
            <button
              type="button"
              key={k}
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn("h-10 rounded-full px-4 text-sm font-semibold transition-colors", kind === k ? "bg-fg text-bg" : "bg-surface-2 text-fg")}
            >
              {ACTIVITIES[k].label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duração">{(id) => <Input id={id} value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="numeric" suffix="min" />}</Field>
          {ACTIVITIES[kind].hasDistance && (
            <Field label="Distância (opcional)">{(id) => <Input id={id} value={km} onChange={(e) => setKm(e.target.value)} inputMode="decimal" suffix="km" />}</Field>
          )}
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
          <span className="text-sm text-muted">Calorias estimadas</span>
          <span className="text-xl font-extrabold">{kcal} kcal</span>
        </div>
        <p className="-mt-2 text-xs text-muted">Estimativa por equivalente metabólico (MET) e pelo seu último peso ({fmt1(weight)} kg).</p>
        <Button type="submit" size="lg" block loading={busy}>
          Adicionar ao dia
        </Button>
      </form>
    </Sheet>
  );
}
