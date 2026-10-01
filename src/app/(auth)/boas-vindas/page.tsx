import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Ring } from "@/components/ui/Progress";

export const metadata: Metadata = { title: "Boas-vindas" };

export default function WelcomePage() {
  return (
    <div className="flex flex-1 flex-col animate-enter">
      <div className="flex flex-1 flex-col items-center justify-center gap-10 py-6 text-center">
        <Ring value={68} max={100} size={200} stroke={16} label="Exemplo de progresso diário">
          <div>
            <p className="text-4xl font-extrabold tracking-tight">68%</p>
            <p className="text-sm text-muted">da meta de hoje</p>
          </div>
        </Ring>
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-balance">Vamos cuidar da sua evolução.</h1>
          <p className="mx-auto mt-3 max-w-[32ch] text-[15px] text-muted">
            Registre refeições, água, peso e treinos. Veja seu progresso todos os dias, sem complicação.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <ButtonLink href="/cadastro" size="lg" block>
          Começar agora
        </ButtonLink>
        <ButtonLink href="/login" variant="ghost" size="lg" block>
          Já tenho conta
        </ButtonLink>
      </div>
    </div>
  );
}
