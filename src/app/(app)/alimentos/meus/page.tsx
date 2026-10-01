"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Wheat } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState, Skeleton } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/Confirm";
import { useApp } from "@/components/app/AppProvider";
import { invalidate, useQuery } from "@/hooks/useQuery";
import { deleteFood } from "@/data/foods";
import { check, errorMessage, sb } from "@/data/base";
import type { Food } from "@/lib/types";
import { fmt, fmt1 } from "@/lib/format";

export default function MyFoodsPage() {
  const { profile } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const foods = useQuery("myfoods", async () => check(await sb().from("foods").select("*").eq("user_id", profile.id).order("name")) as Food[]);

  const list = useMemo(() => (foods.data ?? []).filter((f) => f.name.toLowerCase().includes(q.toLowerCase())), [foods.data, q]);

  async function remove(f: Food) {
    if (!(await confirm({ title: "Excluir alimento?", text: `${f.name} sai da sua lista. O que já está no diário continua registrado.`, confirmLabel: "Excluir", danger: true }))) return;
    try {
      await deleteFood(f.id);
      invalidate("myfoods", "foods:");
      toast.success("Alimento excluído.");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <main className="flex flex-col gap-4">
      <PageHeader
        title="Meus alimentos"
        back
        action={
          <Link href="/alimentos/novo" className="grid h-10 w-10 place-items-center rounded-full bg-brand text-on-brand" aria-label="Cadastrar alimento">
            <Plus className="h-5 w-5" />
          </Link>
        }
      />
      {(foods.data?.length ?? 0) > 6 && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar" className="h-11 rounded-full border border-line bg-surface px-4 text-[16px] focus:border-brand focus:outline-none" aria-label="Filtrar alimentos" />}
      {foods.loading ? (
        [0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon={<Wheat className="h-6 w-6" />} title="Nenhum alimento cadastrado" text="Cadastre alimentos com os dados do rótulo para usar no diário e nas receitas." action={<ButtonLink href="/alimentos/novo">Cadastrar alimento</ButtonLink>} />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-3 shadow-card">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{f.name}</p>
                <p className="truncate text-[13px] text-muted">
                  {[f.brand, `${fmt(f.kcal_100g)} kcal · P ${fmt1(f.protein_100g)} · C ${fmt1(f.carbs_100g)} · G ${fmt1(f.fat_100g)} por 100 g`].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Link href={`/alimentos/novo?id=${f.id}`} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label={`Editar ${f.name}`}>
                <Pencil className="h-4 w-4" />
              </Link>
              <button onClick={() => remove(f)} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-danger" aria-label={`Excluir ${f.name}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
