"use client";

import { Dumbbell, Sparkles } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { CATEGORY_LABELS } from "@/lib/exercise";
import type { Exercise } from "@/lib/types";

/** Folha com o vídeo de demonstração (gerado por IA), a categoria e a descrição do exercício. */
export function ExerciseSheet({ exercise, onClose }: { exercise: Exercise | null; onClose: () => void }) {
  return (
    <Sheet open={!!exercise} onClose={onClose} title={exercise?.name}>
      {exercise && (
        <div className="flex flex-col gap-4 pb-4">
          {exercise.video_url ? (
            <div className="flex flex-col gap-2">
              <video
                // O vídeo recomeça quando se abre outro exercício.
                key={exercise.id}
                src={exercise.video_url}
                className="aspect-video w-full rounded-2xl bg-black object-cover"
                autoPlay
                muted
                loop
                playsInline
                controls
                preload="metadata"
                aria-label={`Demonstração do exercício ${exercise.name}`}
              />
              <p className="flex items-center gap-1.5 text-[12px] text-muted">
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> Vídeo gerado por IA, só como referência de movimento.
              </p>
            </div>
          ) : (
            <div className="grid aspect-video w-full place-items-center rounded-2xl bg-surface-2 text-center text-muted">
              <div className="flex flex-col items-center gap-2 px-6">
                <Dumbbell className="h-7 w-7" aria-hidden />
                <p className="text-sm font-semibold">Vídeo em breve</p>
              </div>
            </div>
          )}
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{CATEGORY_LABELS[exercise.category]}</p>
            {exercise.description ? <p className="mt-1.5 text-[15px] leading-relaxed">{exercise.description}</p> : null}
          </div>
        </div>
      )}
    </Sheet>
  );
}
