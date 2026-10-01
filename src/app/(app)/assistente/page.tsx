"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Lock, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { useApp } from "@/components/app/AppProvider";
import { keys, useDay } from "@/hooks/useDay";
import { useQuery } from "@/hooks/useQuery";
import { highProteinFoods, listFavorites, listRecent } from "@/data/foods";
import { listRecipes } from "@/data/recipes";
import { localAssistant, SUGGESTIONS } from "@/lib/assistant";
import { today } from "@/lib/dates";
import { cn } from "@/lib/cn";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

export default function AssistantPage() {
  const { can, profile } = useApp();
  const day = useDay(today());
  const recent = useQuery(keys.recent, () => listRecent(20));
  const favorites = useQuery(keys.favorites, listFavorites);
  const protein = useQuery("foods:protein", () => highProteinFoods(10));
  const recipes = useQuery(keys.recipes, listRecipes);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, thinking]);

  if (!can("assistant")) {
    return (
      <main>
        <PageHeader title="Assistente Nutri" back />
        <Card>
          <EmptyState
            icon={<Lock className="h-6 w-6" />}
            title="Recurso Premium"
            text="Pergunte quanto ainda pode comer, quanto de proteína falta ou peça sugestões de refeição com base no seu diário."
            action={<ButtonLink href="/premium">Conhecer o Premium</ButtonLink>}
          />
        </Card>
      </main>
    );
  }

  async function ask(question: string) {
    const q = question.trim();
    if (!q || thinking) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setText("");
    setThinking(true);
    const answer = await localAssistant.answer(q, {
      totals: day.totals,
      goal: day.goal,
      burned: day.burned,
      meals: day.meals,
      entries: day.entries,
      foods: [...(recent.data ?? []), ...(favorites.data ?? []), ...(protein.data ?? [])],
      recipes: recipes.data ?? [],
    });
    await new Promise((r) => setTimeout(r, 350));
    setMsgs((m) => [...m, { role: "assistant", text: answer }]);
    setThinking(false);
  }

  const ready = !day.loading && !recent.loading && !recipes.loading;

  return (
    <main className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <PageHeader title="Assistente Nutri" subtitle="Responde com os dados do seu diário" back />

      <div className="flex flex-1 flex-col gap-3 pb-4">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-8 text-center animate-enter">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-brand-strong">
              <Sparkles className="h-6 w-6" />
            </span>
            <p className="font-bold">Olá{profile.name ? `, ${profile.name.split(" ")[0]}` : ""}! Em que posso ajudar?</p>
            <p className="max-w-[34ch] text-sm text-muted">As respostas usam só o que você registrou. Não substituem orientação de nutricionista.</p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn("max-w-[85%] whitespace-pre-line rounded-3xl px-4 py-3 text-[15px] animate-enter", m.role === "user" ? "self-end rounded-br-lg bg-brand text-on-brand" : "self-start rounded-bl-lg bg-surface shadow-card")}>
            {m.text}
          </div>
        ))}
        {thinking && (
          <div className="flex gap-1 self-start rounded-3xl bg-surface px-4 py-4 shadow-card" aria-label="Pensando">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        )}
        <div ref={bottom} />
      </div>

      <div className="sticky bottom-24 flex flex-col gap-2 bg-bg/90 pt-2 backdrop-blur-md">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => ask(s)} disabled={!ready || thinking} className="h-9 shrink-0 rounded-full border border-line bg-surface px-3.5 text-sm font-medium disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(text);
          }}
          className="relative"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pergunte sobre sua alimentação"
            aria-label="Sua pergunta"
            className="h-12 w-full rounded-full border border-line bg-surface pl-5 pr-14 text-[16px] focus:border-brand focus:outline-none"
          />
          <button type="submit" disabled={!text.trim() || !ready || thinking} className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-full bg-brand text-on-brand disabled:opacity-40" aria-label="Enviar">
            <ArrowUp className="h-5 w-5" />
          </button>
        </form>
      </div>
    </main>
  );
}
