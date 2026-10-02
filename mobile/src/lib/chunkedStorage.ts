/**
 * Adaptador de armazenamento que divide valores grandes em pedaços.
 * O SecureStore (Keychain/Keystore) recomenda valores de até 2048 bytes, e a sessão do
 * Supabase (JSON com access e refresh token) costuma passar disso.
 *
 * Formato: `${key}.n` guarda a quantidade de pedaços; `${key}.0`, `${key}.1`… guardam o texto.
 */

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const DEFAULT_CHUNK_SIZE = 1800;

const countKey = (key: string) => `${key}.n`;
const chunkKey = (key: string, i: number) => `${key}.${i}`;

export function splitIntoChunks(value: string, size: number): string[] {
  if (size < 1) throw new Error("size precisa ser positivo");
  const out: string[] = [];
  for (let i = 0; i < value.length; i += size) out.push(value.slice(i, i + size));
  return out.length ? out : [""];
}

export function createChunkedStorage(store: KeyValueStore, chunkSize = DEFAULT_CHUNK_SIZE): KeyValueStore {
  async function readCount(key: string): Promise<number | null> {
    const raw = await store.getItem(countKey(key));
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 ? n : null;
  }

  async function removeItem(key: string): Promise<void> {
    const n = await readCount(key);
    if (n != null) {
      for (let i = 0; i < n; i++) await store.removeItem(chunkKey(key, i));
      await store.removeItem(countKey(key));
    }
    await store.removeItem(key);
  }

  return {
    async getItem(key) {
      const n = await readCount(key);
      if (n == null) return store.getItem(key);
      const parts: string[] = [];
      for (let i = 0; i < n; i++) {
        const part = await store.getItem(chunkKey(key, i));
        // Pedaço faltando = valor corrompido (ex.: app fechado no meio da escrita).
        if (part == null) return null;
        parts.push(part);
      }
      return parts.join("");
    },
    async setItem(key, value) {
      await removeItem(key);
      const parts = splitIntoChunks(value, chunkSize);
      for (let i = 0; i < parts.length; i++) await store.setItem(chunkKey(key, i), parts[i]!);
      // A contagem por último: se a escrita for interrompida, a leitura vê "sem valor", não um valor pela metade.
      await store.setItem(countKey(key), String(parts.length));
    },
    removeItem,
  };
}
