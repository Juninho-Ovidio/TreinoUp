"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Logo } from "@/components/app/Logo";
import { useToast } from "@/components/ui/Toast";
import { supabaseBrowser } from "@/lib/supabase/client";
import { authMessage, fieldErrors, resetSchema } from "@/lib/validation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = resetSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (error) return setErrors({ form: authMessage(error.message) });
    toast.success("Senha alterada.");
    router.replace("/inicio");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
      <Logo className="mb-10" />
      <h1 className="text-[28px] font-extrabold tracking-tight">Nova senha</h1>
      <p className="mt-1 text-[15px] text-muted">Escolha uma senha com pelo menos 8 caracteres.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
        <Field label="Nova senha" error={errors.password}>
          {(id, d) => <Input id={id} name="password" type="password" autoComplete="new-password" aria-describedby={d} invalid={!!errors.password} />}
        </Field>
        <Field label="Confirmar nova senha" error={errors.confirm}>
          {(id, d) => <Input id={id} name="confirm" type="password" autoComplete="new-password" aria-describedby={d} invalid={!!errors.confirm} />}
        </Field>
        {errors.form && (
          <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" block loading={loading}>
          Salvar senha
        </Button>
      </form>
    </main>
  );
}
