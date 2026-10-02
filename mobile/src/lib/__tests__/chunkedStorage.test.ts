import { createChunkedStorage, splitIntoChunks, type KeyValueStore } from "../chunkedStorage";

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
}

describe("splitIntoChunks", () => {
  it("divide no tamanho pedido", () => {
    expect(splitIntoChunks("abcdefg", 3)).toEqual(["abc", "def", "g"]);
  });
  it("texto vazio vira um pedaço vazio", () => {
    expect(splitIntoChunks("", 3)).toEqual([""]);
  });
  it("recusa tamanho inválido", () => {
    expect(() => splitIntoChunks("a", 0)).toThrow();
  });
});

describe("createChunkedStorage", () => {
  it("grava e lê valores maiores que um pedaço", async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store, 4);
    const session = JSON.stringify({ access_token: "x".repeat(25), refresh_token: "y" });
    await storage.setItem("sb-auth", session);
    expect(await storage.getItem("sb-auth")).toBe(session);
    expect(store.data.get("sb-auth.n")).toBe(String(Math.ceil(session.length / 4)));
  });

  it("ao regravar um valor menor, apaga os pedaços que sobraram", async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store, 2);
    await storage.setItem("k", "abcdef");
    await storage.setItem("k", "xy");
    expect(await storage.getItem("k")).toBe("xy");
    expect([...store.data.keys()].sort()).toEqual(["k.0", "k.n"]);
  });

  it("removeItem apaga tudo", async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store, 2);
    await storage.setItem("k", "abcdef");
    await storage.removeItem("k");
    expect(store.data.size).toBe(0);
    expect(await storage.getItem("k")).toBeNull();
  });

  it("lê o formato antigo (valor inteiro, sem contagem)", async () => {
    const store = memoryStore();
    store.data.set("k", "legado");
    expect(await createChunkedStorage(store).getItem("k")).toBe("legado");
  });

  it("pedaço faltando = sem valor (escrita interrompida)", async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store, 2);
    await storage.setItem("k", "abcdef");
    store.data.delete("k.1");
    expect(await storage.getItem("k")).toBeNull();
  });

  it("contagem corrompida é ignorada", async () => {
    const store = memoryStore();
    store.data.set("k.n", "abc");
    store.data.set("k", "valor");
    expect(await createChunkedStorage(store).getItem("k")).toBe("valor");
  });
});
