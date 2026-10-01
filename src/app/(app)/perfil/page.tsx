"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  Bell,
  Camera,
  ChefHat,
  ChevronRight,
  Crown,
  Download,
  Dumbbell,
  Leaf,
  Loader2,
  LogOut,
  Ruler,
  Shield,
  Sparkles,
  Target,
  Trash2,
  UserRound,
  Wheat,
} from "lucide-react";
import { useApp } from "@/components/app/AppProvider";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/Confirm";
import { updateProfile } from "@/data/profile";
import { deleteAccount, exportAll, uploadAvatar } from "@/data/account";
import { errorMessage } from "@/data/base";
import { supabaseBrowser } from "@/lib/supabase/client";
import { clearQueryCache, useQuery } from "@/hooks/useQuery";
import { useLatestWeight } from "@/hooks/useDay";
import { DIET_LABELS, GOAL_LABELS } from "@/lib/goals";
import { fmt1, greetingFirstName } from "@/lib/format";
import type { Theme } from "@/lib/types";
import { today } from "@/lib/dates";

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { profile, setProfile, isPremium, can } = useApp();
  const weight = useLatestWeight();
  const email = useQuery("auth:email", async () => (await supabaseBrowser().auth.getUser()).data.user?.email ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(file);
      setProfile(await updateProfile({ avatar_url: url }));
      toast.success("Foto atualizada.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function setTheme(theme: Theme) {
    setProfile({ ...profile, theme });
    try {
      await updateProfile({ theme });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function doExport() {
    if (!can("export")) return router.push("/premium");
    setExporting(true);
    try {
      const blob = await exportAll();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `treinoup-${today()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success("Arquivo gerado.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  }

  async function logout() {
    await supabaseBrowser().auth.signOut();
    clearQueryCache();
    router.replace("/login");
    router.refresh();
  }

  async function removeAccount() {
    const ok = await confirm({
      title: "Excluir sua conta?",
      text: "Todos os seus registros, alimentos, receitas e treinos serão apagados para sempre. Não dá para desfazer.",
      confirmLabel: "Excluir conta",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteAccount();
      clearQueryCache();
      router.replace("/boas-vindas");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const name = profile.name || "Sem nome";

  return (
    <main className="flex flex-col gap-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <h1 className="text-[22px] font-extrabold tracking-tight">Perfil</h1>

      <Card className="flex items-center gap-4">
        <button onClick={() => fileRef.current?.click()} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-brand-soft text-2xl font-extrabold text-brand-strong" aria-label="Trocar foto">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full w-full place-items-center">{(greetingFirstName(profile.name)[0] ?? "N").toUpperCase()}</span>
          )}
          <span className="absolute inset-x-0 bottom-0 grid h-6 place-items-center bg-black/45 text-white">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate text-lg font-extrabold">
            {name}
            {isPremium && (
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-strong">Premium</span>
            )}
          </p>
          <p className="truncate text-sm text-muted">{email.data}</p>
          <p className="mt-1 text-sm">
            {weight.data ? `${fmt1(weight.data.weight_kg)} kg` : "–"} · {profile.height_cm ? `${fmt1(profile.height_cm)} cm` : "–"} · {profile.goal ? GOAL_LABELS[profile.goal] : "–"}
          </p>
        </div>
      </Card>

      {!isPremium && (
        <Link href="/premium" className="flex items-center gap-3 rounded-[var(--radius-card)] bg-fg p-4 text-bg">
          <Crown className="h-6 w-6 text-carbs" aria-hidden />
          <span className="flex-1">
            <span className="block font-bold">TreinoUp Premium</span>
            <span className="block text-sm opacity-75">Relatórios, assistente, histórico completo e exportação.</span>
          </span>
          <ChevronRight className="h-5 w-5 opacity-70" />
        </Link>
      )}

      <section className="flex flex-col gap-2">
        <SectionTitle>Conta e metas</SectionTitle>
        <Card className="p-1.5">
          <Row href="/perfil/editar" icon={UserRound} label="Editar informações" />
          <Row href="/perfil/metas" icon={Target} label="Alterar metas" />
          <Row href="/perfil/dieta" icon={Leaf} label="Preferências nutricionais" value={DIET_LABELS[profile.diet_preference].title} />
          <Row href="/perfil/notificacoes" icon={Bell} label="Notificações" />
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>Meus dados</SectionTitle>
        <Card className="p-1.5">
          <Row href="/alimentos/meus" icon={Wheat} label="Meus alimentos" />
          <Row href="/receitas" icon={ChefHat} label="Receitas" />
          <Row href="/treinos" icon={Dumbbell} label="Treinos" />
          <Row href="/progresso/medidas" icon={Ruler} label="Medidas" />
          <Row href="/assistente" icon={Sparkles} label="Assistente Nutri" value={can("assistant") ? undefined : "Premium"} />
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>Aparência e unidades</SectionTitle>
        <Card className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold">Modo escuro</p>
            <Segmented
              label="Tema"
              value={profile.theme}
              onChange={setTheme}
              options={[
                { value: "system", label: "Automático" },
                { value: "light", label: "Claro" },
                { value: "dark", label: "Escuro" },
              ]}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Unidades</span>
            <span className="text-sm text-muted">Métrico (kg, cm, ml)</span>
          </div>
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>Privacidade</SectionTitle>
        <Card className="p-1.5">
          <Row href="/perfil/privacidade" icon={Shield} label="Privacidade e dados" />
          <Row onClick={doExport} icon={exporting ? Loader2 : Download} label="Exportar dados" value={can("export") ? "JSON" : "Premium"} />
          <Row onClick={removeAccount} icon={Trash2} label="Excluir conta" danger />
        </Card>
      </section>

      <button onClick={logout} className="flex h-12 items-center justify-center gap-2 rounded-full font-semibold text-muted hover:bg-surface-2 hover:text-fg">
        <LogOut className="h-5 w-5" /> Sair
      </button>
    </main>
  );
}

function Row({
  href,
  onClick,
  icon: Icon,
  label,
  value,
  danger,
}: {
  href?: string;
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  danger?: boolean;
}) {
  const inner = (
    <>
      <span className={`grid h-9 w-9 place-items-center rounded-full ${danger ? "bg-danger/10 text-danger" : "bg-surface-2 text-muted"}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className={`flex-1 text-left font-semibold ${danger ? "text-danger" : ""}`}>{label}</span>
      {value && <span className="text-sm text-muted">{value}</span>}
      {!danger && <ChevronRight className="h-5 w-5 text-faint" />}
    </>
  );
  const cls = "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-surface-2";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
