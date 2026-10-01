import { Skeleton } from "@/components/ui/Card";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 pt-[max(1.25rem,env(safe-area-inset-top))]" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 rounded-[var(--radius-card)]" />
      <Skeleton className="h-56 rounded-[var(--radius-card)]" />
      <Skeleton className="h-32 rounded-[var(--radius-card)]" />
    </div>
  );
}
