import { create } from "zustand";

/**
 * Para onde ir depois que a sessão for aberta por um link (ex.: "/reset-password").
 * A tela de callback guarda o destino; o layout raiz navega quando o app estiver pronto.
 */
export const usePendingRedirect = create<{ next: string | null }>(() => ({ next: null }));
