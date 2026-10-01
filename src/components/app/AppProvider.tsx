"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Profile } from "@/lib/types";
import { getProfile } from "@/data/profile";
import { effectivePlan, type Feature, can } from "@/lib/plans";

interface AppCtx {
  profile: Profile;
  refreshProfile: () => Promise<void>;
  setProfile: (p: Profile) => void;
  isPremium: boolean;
  can: (f: Feature) => boolean;
  /** Painéis globais abertos pelo botão "+" e por atalhos. */
  sheet: SheetName | null;
  openSheet: (s: SheetName | null) => void;
}

export type SheetName = "add" | "water" | "weight" | "activity";

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ initialProfile, children }: { initialProfile: Profile; children: React.ReactNode }) {
  const [profile, setProfile] = useState(initialProfile);
  const [sheet, setSheet] = useState<SheetName | null>(null);

  const refreshProfile = useCallback(async () => {
    setProfile(await getProfile());
  }, []);

  // Mantém o tema do perfil aplicado e salvo localmente (o script do <head> lê daqui).
  useEffect(() => {
    try {
      localStorage.setItem("nt-theme", profile.theme);
    } catch {}
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", profile.theme === "dark" || (profile.theme === "system" && mq.matches));
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [profile.theme]);

  const plan = profile.plan;
  const canFn = useCallback((f: Feature) => can(plan, f), [plan]);

  const value = useMemo<AppCtx>(
    () => ({
      profile,
      setProfile,
      refreshProfile,
      isPremium: effectivePlan(plan) === "premium",
      can: canFn,
      sheet,
      openSheet: setSheet,
    }),
    [profile, plan, refreshProfile, canFn, sheet],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp precisa estar dentro de <AppProvider>");
  return ctx;
}
