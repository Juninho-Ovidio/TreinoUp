import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { Onboarding } from "./Onboarding";

export const metadata: Metadata = { title: "Seu plano" };

export default async function OnboardingPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("name, onboarded_at").eq("id", claims.sub).single();
  if (profile?.onboarded_at) redirect("/inicio");
  return <Onboarding initialName={profile?.name ?? (claims.user_metadata?.name as string | undefined) ?? ""} />;
}
