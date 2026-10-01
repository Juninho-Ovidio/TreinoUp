"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Card";
import { OAuthButtons } from "@/components/app/OAuthButtons";
import { supabaseBrowser } from "@/lib/supabase/client";
import { authMessage, fieldErrors, signupSchema, siteUrl } from "@/lib/validation";

export default function SignupPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse(Object.fromEntries(f));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    const { data, error } = await supabaseBrowser().auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { name: parsed.data.name },
        emailRedirectTo: `${siteUrl()}/auth/callback?next=/onboarding`,
      },
    });
    setLoading(false);
    if (error) return setErrors({ form: authMessage(error.message) });
    // Com confirmação de e-mail desligada no Supabase, a sessão já vem pronta.
    if (data.session) {
      router.replace("/onboarding");
      router.refresh();
      return;
    }
    setSentTo(parsed.data.email);
  }

  if (sentTo) {
    return (
      <EmptyState
        icon={<MailCheck className="h-7 w-7" />}
        title="Confirme seu e-mail"
        text={`Enviamos um link para ${sentTo}. Abra o e-mail neste aparelho para continuar.`}
        action={
          <Link href="/login" className="text-sm font-semibold text-brand-strong">
            Voltar para o login
          </Link>
        }
        className="flex-1 justify-center"
      />
    );
  }

  return (
    <div className="animate-enter">
      <h1 className="text-[28px] font-extrabold tracking-tight">Criar conta</h1>
      <p className="mt-1 text-[15px] text-muted">Leva menos de dois minutos.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
        <Field label="Nome" error={errors.name}>
          {(id, d) => <Input id={id} name="name" autoComplete="given-name" aria-describedby={d} invalid={!!errors.name} />}
        </Field>
        <Field label="E-mail" error={errors.email}>
          {(id, d) => <Input id={id} name="email" type="email" autoComplete="email" inputMode="email" aria-describedby={d} invalid={!!errors.email} />}
        </Field>
        <Field label="Senha" hint="Pelo menos 8 caracteres." error={errors.password}>
          {(id, d) => <Input id={id} name="password" type="password" autoComplete="new-password" aria-describedby={d} invalid={!!errors.password} />}
        </Field>
        <Field label="Confirmar senha" error={errors.confirm}>
          {(id, d) => <Input id={id} name="confirm" type="password" autoComplete="new-password" aria-describedby={d} invalid={!!errors.confirm} />}
        </Field>
        {errors.form && (
          <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" block loading={loading} className="mt-2">
          Criar conta
        </Button>
        <p className="text-center text-xs text-muted">
          Ao criar a conta você concorda com os Termos de Uso e a Política de Privacidade.
        </p>
      </form>

      <OAuthButtons />

      <p className="mt-8 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-brand-strong">
          Entrar
        </Link>
      </p>
    </div>
  );
}
