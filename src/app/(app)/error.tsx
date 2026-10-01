"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <EmptyState
      className="min-h-[60dvh] justify-center"
      icon={<AlertTriangle className="h-6 w-6" />}
      title="Algo deu errado nesta tela"
      text="Seus dados estão salvos. Tente carregar de novo."
      action={<Button onClick={reset}>Tentar de novo</Button>}
    />
  );
}
