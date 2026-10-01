"use client";

import { useEffect, useState } from "react";
import { BellOff } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Skeleton } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { REMINDER_TEXT } from "@/components/app/ReminderScheduler";
import { invalidate, mutateCache, useQuery } from "@/hooks/useQuery";
import { listReminders, updateReminder } from "@/data/account";
import { errorMessage } from "@/data/base";
import type { Reminder } from "@/lib/types";
import { cn } from "@/lib/cn";

export default function NotificationsPage() {
  const toast = useToast();
  const reminders = useQuery("reminders", listReminders);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  async function ask() {
    if (typeof Notification === "undefined") return;
    setPermission(await Notification.requestPermission());
  }

  async function patch(r: Reminder, change: Partial<Pick<Reminder, "enabled" | "at_time">>) {
    if (change.enabled && permission === "default") await ask();
    mutateCache<Reminder[]>("reminders", (l) => (l ?? []).map((x) => (x.id === r.id ? { ...x, ...change } : x)));
    try {
      await updateReminder(r.id, change);
      window.dispatchEvent(new Event("nt-reminders-changed"));
    } catch (e) {
      toast.error(errorMessage(e));
      invalidate("reminders");
    }
  }

  return (
    <main className="flex flex-col gap-4">
      <PageHeader title="Notificações" back />

      {permission === "denied" && (
        <Card className="flex items-start gap-3">
          <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
          <p className="text-sm">As notificações estão bloqueadas neste navegador. Libere nas configurações do site para receber os lembretes.</p>
        </Card>
      )}
      {permission === "default" && (
        <Card className="flex items-center gap-3">
          <p className="flex-1 text-sm">Permita as notificações para receber os lembretes.</p>
          <Button size="sm" onClick={ask}>
            Permitir
          </Button>
        </Card>
      )}
      {permission === "unsupported" && (
        <Card>
          <p className="text-sm">Este navegador não oferece notificações. No iPhone, adicione o TreinoUp à tela de início para ativá-las.</p>
        </Card>
      )}

      <Card className="p-1.5">
        {reminders.loading ? (
          <Skeleton className="m-2 h-60" />
        ) : (
          <ul className="divide-y divide-line">
            {(reminders.data ?? []).map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{REMINDER_TEXT[r.kind].label}</span>
                  <input
                    type="time"
                    value={r.at_time.slice(0, 5)}
                    onChange={(e) => e.target.value && patch(r, { at_time: e.target.value })}
                    className="mt-0.5 rounded-lg bg-transparent text-sm text-muted focus:outline-none"
                    aria-label={`Horário de ${REMINDER_TEXT[r.kind].label}`}
                  />
                </span>
                <button
                  role="switch"
                  aria-checked={r.enabled}
                  aria-label={REMINDER_TEXT[r.kind].label}
                  onClick={() => patch(r, { enabled: !r.enabled })}
                  className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", r.enabled ? "bg-brand" : "bg-[var(--ring-track)]")}
                >
                  <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left]", r.enabled ? "left-[22px]" : "left-0.5")} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-center text-xs text-muted">Os lembretes aparecem enquanto o app estiver aberto ou instalado e ativo em segundo plano.</p>
    </main>
  );
}
