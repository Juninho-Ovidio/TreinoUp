"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cache mínimo de consultas, no estilo SWR:
 * - a mesma chave é buscada uma vez e compartilhada entre componentes;
 * - dados em cache aparecem na hora e são revalidados em segundo plano;
 * - invalidate("diary:") atualiza tudo que começa com esse prefixo.
 */
interface CacheEntry {
  data?: unknown;
  error?: unknown;
  promise?: Promise<unknown>;
  updatedAt: number;
  fetcher?: () => Promise<unknown>;
  /** pedido de atualização chegou durante uma busca em andamento */
  again?: boolean;
  subs: Set<() => void>;
}

const cache = new Map<string, CacheEntry>();
const STALE_MS = 30_000;

function entry(key: string): CacheEntry {
  let e = cache.get(key);
  if (!e) {
    e = { updatedAt: 0, subs: new Set() };
    cache.set(key, e);
  }
  return e;
}

function notify(e: CacheEntry) {
  e.subs.forEach((fn) => fn());
}

async function run(key: string): Promise<void> {
  const e = entry(key);
  if (!e.fetcher) return;
  if (e.promise) {
    // Os dados em andamento podem ser anteriores a uma alteração: busca de novo ao terminar.
    e.again = true;
    await e.promise.catch(() => undefined);
    return;
  }
  const p = e.fetcher();
  e.promise = p;
  notify(e);
  try {
    e.data = await p;
    e.error = undefined;
    e.updatedAt = Date.now();
  } catch (err) {
    e.error = err;
  } finally {
    e.promise = undefined;
    notify(e);
  }
  if (e.again) {
    e.again = false;
    await run(key);
  }
}

export function useQuery<T>(key: string | null, fetcher: () => Promise<T>) {
  const [, force] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!key) return;
    const e = entry(key);
    e.fetcher = () => fetcherRef.current();
    const sub = () => force((n) => n + 1);
    e.subs.add(sub);
    if (!e.promise && Date.now() - e.updatedAt > STALE_MS) void run(key);
    else sub();
    return () => {
      e.subs.delete(sub);
    };
  }, [key]);

  const e = key ? cache.get(key) : undefined;
  const refresh = useCallback(() => (key ? run(key) : Promise.resolve()), [key]);

  return {
    data: e?.data as T | undefined,
    error: e?.error as Error | undefined,
    /** true só no primeiro carregamento (sem dados ainda) */
    loading: !!key && e?.data === undefined && !e?.error,
    refreshing: !!e?.promise,
    refresh,
  };
}

/** Atualiza (ou descarta) todas as consultas cuja chave começa com o prefixo. */
export function invalidate(...prefixes: string[]) {
  for (const [key, e] of cache) {
    if (!prefixes.some((p) => key.startsWith(p))) continue;
    if (e.subs.size > 0) void run(key);
    else cache.delete(key);
  }
}

/** Atualização otimista: muda o dado em cache imediatamente. */
export function mutateCache<T>(key: string, updater: (prev: T | undefined) => T) {
  const e = entry(key);
  e.data = updater(e.data as T | undefined);
  notify(e);
}

export function clearQueryCache() {
  cache.clear();
}
