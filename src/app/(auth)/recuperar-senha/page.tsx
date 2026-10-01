"use client";

import Link from "next/link";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Card";
import { supabaseBrowser } from "@/lib/supabase/client";
import { authMessage, fieldErrors, recoverSchema, siteUrl } from "@/lib/validation";

export default function RecoverPage() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = recoverSchema.safeParse({ email: new FormData(e.currentTarget).get("email") });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/redefinir-senha`,
    });
    setLoading(false);
    // Por segurança, a mesma resposta aparece exista ou não uma conta com o e-mail.
    if (error && /rate|fetch/i.test(error.message)) return setErrors({ form: authMessage(error.message) });
    setSent(true);
  }

  if (sent) {
    return (
      <EmptyState
        icon={<MailCheck className="h-7 w-7" />}
        title="Verifique seu e-mail"
        text="Se houver uma conta com esse endereço, você vai receber um link para criar uma nova senha."
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
      <h1 className="text-[28px] font-extrabold tracking-tight">Recuperar senha</h1>
      <p className="mt-1 text-[15px] text-muted">Informe o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
        <Field label="E-mail" error={errors.email}>
          {(id, d) => <Input id={id} name="email" type="email" autoComplete="email" inputMode="email" aria-describedby={d} invalid={!!errors.email} />}
        </Field>
        {errors.form && (
          <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" block loading={loading}>
          Enviar link
        </Button>
        <Link href="/login" className="text-center text-sm font-semibold text-muted">
          Voltar para o login
        </Link>
      </form>
    </div>
  );
}
