import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { AppProvider } from "@/components/app/AppProvider";
import { ConfirmProvider } from "@/components/ui/Confirm";
import { BottomNav } from "@/components/app/BottomNav";
import { GlobalSheets } from "@/components/app/GlobalSheets";
import { ReminderScheduler } from "@/components/app/ReminderScheduler";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single<Profile>();
  if (!profile?.onboarded_at) redirect("/onboarding");

  return (
    <AppProvider initialProfile={profile}>
      <div className="app-bg" aria-hidden />
      <ConfirmProvider>
        <div className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-32 lg:max-w-5xl">{children}</div>
        <BottomNav />
        <GlobalSheets />
        <ReminderScheduler />
      </ConfirmProvider>
    </AppProvider>
  );
}
