import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-5">
      <EmptyState title="Página não encontrada" text="O endereço pode ter mudado ou não existir mais." action={<ButtonLink href="/inicio">Ir para o início</ButtonLink>} />
    </main>
  );
}
