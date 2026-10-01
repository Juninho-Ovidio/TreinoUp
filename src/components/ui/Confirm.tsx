"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Sheet } from "./Sheet";
import { Button } from "./Button";

interface ConfirmOptions {
  title: string;
  text?: string;
  confirmLabel?: string;
  danger?: boolean;
}

const Ctx = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

/** Confirmação dentro do app (sem window.confirm). Uso: if (await confirm({...})) … */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>(undefined);

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((res) => {
      resolver.current = res;
    });
  }, []);

  const close = useCallback((v: boolean) => {
    resolver.current?.(v);
    resolver.current = undefined;
    setOpts(null);
  }, []);

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Sheet open={!!opts} onClose={() => close(false)} variant="dialog" title={opts?.title}>
        {opts?.text && <p className="-mt-2 mb-6 text-[15px] text-muted">{opts.text}</p>}
        <div className="flex gap-3">
          <Button variant="secondary" block onClick={() => close(false)}>
            Cancelar
          </Button>
          <Button variant={opts?.danger ? "danger" : "primary"} block onClick={() => close(true)}>
            {opts?.confirmLabel ?? "Confirmar"}
          </Button>
        </div>
      </Sheet>
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConfirm precisa estar dentro de <ConfirmProvider>");
  return ctx;
}
