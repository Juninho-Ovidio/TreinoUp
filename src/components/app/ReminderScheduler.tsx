"use client";

import { useEffect } from "react";
import { listReminders } from "@/data/account";
import type { Reminder, ReminderKind } from "@/lib/types";
import { today } from "@/lib/dates";

export const REMINDER_TEXT: Record<ReminderKind, { label: string; title: string; body: string }> = {
  water: { label: "Hora de beber água", title: "Hora de beber água", body: "Um copo agora ajuda a bater a meta do dia." },
  meal: { label: "Registrar refeição", title: "Registrar refeição", body: "Anote o que você comeu enquanto está fresco na memória." },
  weight: { label: "Registrar peso", title: "Registrar peso", body: "Pese-se em jejum, depois de ir ao banheiro." },
  workout: { label: "Treinar", title: "Hora do treino", body: "Seu treino de hoje está te esperando." },
  dinner: { label: "Registrar jantar", title: "Registrar jantar", body: "Falta pouco para fechar o dia no diário." },
};

/**
 * Lembretes locais: disparam enquanto o app (ou a aba) está aberto.
 * Para lembretes com o app fechado é preciso Web Push com um servidor (VAPID) — ponto de extensão futuro.
 */
export function ReminderScheduler() {
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    let reminders: Reminder[] = [];
    let alive = true;

    listReminders()
      .then((r) => {
        if (alive) reminders = r;
      })
      .catch(() => undefined);

    const tick = async () => {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      for (const r of reminders) {
        if (!r.enabled || r.at_time.slice(0, 5) !== hhmm) continue;
        const flag = `nt-reminder-${r.kind}-${today()}`;
        try {
          if (localStorage.getItem(flag)) continue;
          localStorage.setItem(flag, "1");
        } catch {}
        const t = REMINDER_TEXT[r.kind];
        const reg = await navigator.serviceWorker?.getRegistration();
        if (reg) reg.showNotification(t.title, { body: t.body, icon: "/icons/icon-192.png", tag: r.kind });
        else new Notification(t.title, { body: t.body, icon: "/icons/icon-192.png" });
      }
    };

    const id = setInterval(tick, 30_000);
    const refresh = () => listReminders().then((r) => (reminders = r)).catch(() => undefined);
    window.addEventListener("nt-reminders-changed", refresh);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener("nt-reminders-changed", refresh);
    };
  }, []);
  return null;
}
