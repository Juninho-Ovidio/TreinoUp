"use client";

import { useEffect } from "react";

/** Registra o service worker (PWA) apenas em produção. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Sem service worker o app funciona normalmente, só sem modo offline.
    });
  }, []);
  return null;
}
