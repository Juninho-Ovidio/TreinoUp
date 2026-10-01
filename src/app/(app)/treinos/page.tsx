"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Dumbbell, Flame, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState, Skeleton } from "@/components/ui/Card";
import { ExercisePicker } from "@/components/app/ExercisePicker";
import { useApp } from "@/components/app/AppProvider";
import { useQuery } from "@/hooks/useQuery";
import { keys } from "@/hooks/useDay";
import { listWorkouts } from "@/data/workouts";
import { relativeDayLabel } from "@/lib/dates";
import { workoutVolume } from "@/lib/exercise";
import { fmt } from "@/lib/format";

export default function WorkoutsPage() {
  const { openSheet } = useApp();
  const workouts = useQuery(keys.workouts, () => listWorkouts(60));
  const [catalog, setCatalog] = useState(false);
  const list = workouts.data ?? [];

  return (
    <main className="flex flex-col gap-4">
      <PageHeader
        title="Treinos"
        action={
          <Link href="/treinos/novo" className="grid h-10 w-10 place-items-center rounded-full bg-brand text-on-brand" aria-label="Novo treino">
            <Plus className="h-5 w-5" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => setCatalog(true)}>
          <BookOpen className="h-4 w-4" /> Exercícios
        </Button>
        <Button variant="secondary" onClick={() => openSheet("activity")}>
          <Flame className="h-4 w-4" /> Cardio e esporte
        </Button>
      </div>

      {workouts.loading ? (
        [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-[var(--radius-card)]" />)
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Dumbbell className="h-6 w-6" />}
            title="Nenhum treino registrado"
            text="Anote séries, repetições e carga. Na próxima vez, o app sugere as cargas que você usou."
            action={<ButtonLink href="/treinos/novo">Registrar treino</ButtonLink>}
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((w) => (
            <li key={w.id} className="animate-enter">
              <Link href={`/treinos/${w.id}`} className="block rounded-[var(--radius-card)] bg-surface p-4 shadow-card active:scale-[0.99]">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-bold">{w.name}</p>
                  <p className="shrink-0 text-sm text-muted">{relativeDayLabel(w.workout_date)}</p>
                </div>
                <p className="mt-0.5 truncate text-[13px] text-muted">{(w.workout_exercises ?? []).map((e) => e.name).join(", ") || "Sem exercícios"}</p>
                <p className="mt-2 text-sm">
                  <b>{w.workout_exercises?.length ?? 0}</b> exercícios · <b>{fmt(workoutVolume(w.workout_exercises ?? []))}</b> kg de volume
                  {w.duration_min ? (
                    <>
                      {" "}
                      · <b>{w.duration_min}</b> min
                    </>
                  ) : null}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <ExercisePicker open={catalog} onClose={() => setCatalog(false)} />
    </main>
  );
}
