import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export default function PrivacyPage() {
  return (
    <main className="flex flex-col gap-4">
      <PageHeader title="Privacidade e dados" back />
      <Card className="flex flex-col gap-4 text-[15px] leading-relaxed">
        <section>
          <h2 className="font-bold">O que guardamos</h2>
          <p className="text-muted">Perfil (nome, idade, sexo, altura), metas, diário alimentar, água, peso, medidas, receitas, treinos e preferências de lembrete.</p>
        </section>
        <section>
          <h2 className="font-bold">Quem vê</h2>
          <p className="text-muted">Só você. O banco de dados aplica regras por usuário: cada conta lê e altera apenas os próprios registros.</p>
        </section>
        <section>
          <h2 className="font-bold">Bases externas</h2>
          <p className="text-muted">Quando você busca um produto ou escaneia um código, o termo pesquisado é enviado ao Open Food Facts. Nenhum dado pessoal vai junto.</p>
        </section>
        <section>
          <h2 className="font-bold">Seus direitos</h2>
          <p className="text-muted">Você pode exportar todos os seus dados em JSON e excluir a conta a qualquer momento, pela tela de Perfil. A exclusão apaga tudo de forma definitiva.</p>
        </section>
        <p className="text-xs text-faint">As metas e estimativas do app são informativas e não substituem acompanhamento profissional.</p>
      </Card>
    </main>
  );
}
