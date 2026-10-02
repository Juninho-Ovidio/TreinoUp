"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { OAuthButtons } from "@/components/app/OAuthButtons";
import { supabaseBrowser } from "@/lib/supabase/client";
import { authMessage, fieldErrors, loginSchema } from "@/lib/validation";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [errors, setErrors] = useState<Record<string, string>>((): Record<string, string> =>
    params.get("erro") === "link" ? { form: "Esse link expirou ou já foi usado. Entre com seu e-mail e senha ou peça um novo link." } : {},
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    const { error } = await supabaseBrowser().auth.signInWithPassword(parsed.data);
    if (error) {
      setLoading(false);
      return setErrors({ form: authMessage(error.message) });
    }
    const next = params.get("next");
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/inicio";
    // O TreinoUp Run (/app) não é uma página do Next: abre com navegação completa.
    if (target === "/app" || target.startsWith("/app/")) {
      window.location.assign(target);
      return;
    }
    router.replace(target);
    router.refresh();
  }

  return (
    <div className="animate-enter">
      <h1 className="text-[28px] font-extrabold tracking-tight">Entrar</h1>
      <p className="mt-1 text-[15px] text-muted">Bom te ver de novo.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
        <Field label="E-mail" error={errors.email}>
          {(id, d) => <Input id={id} name="email" type="email" autoComplete="email" inputMode="email" aria-describedby={d} invalid={!!errors.email} />}
        </Field>
        <Field label="Senha" error={errors.password}>
          {(id, d) => <Input id={id} name="password" type="password" autoComplete="current-password" aria-describedby={d} invalid={!!errors.password} />}
        </Field>
        <Link href="/recuperar-senha" className="-mt-1 self-end text-sm font-semibold text-brand-strong">
          Esqueci minha senha
        </Link>
        {errors.form && (
          <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" block loading={loading} className="mt-2">
          Entrar
        </Button>
      </form>

      <OAuthButtons />

      <p className="mt-8 text-center text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-brand-strong">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
