"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CameraOff, Loader2, PackageX, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { AddFoodSheet } from "@/components/app/AddFoodSheet";
import { useQuery } from "@/hooks/useQuery";
import { keys } from "@/hooks/useDay";
import { listMeals } from "@/data/profile";
import { barcodeExternal, findByBarcodeLocal } from "@/data/foods";
import { errorMessage } from "@/data/base";
import { normalizeBarcode } from "@/lib/foods/provider";
import type { AnyFood } from "@/lib/types";
import { today } from "@/lib/dates";

// BarcodeDetector ainda não está nos tipos padrão do TypeScript.
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

type State =
  | { kind: "starting" }
  | { kind: "scanning" }
  | { kind: "looking"; code: string }
  | { kind: "found"; code: string; food: AnyFood }
  | { kind: "notfound"; code: string }
  | { kind: "error"; message: string };

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

export function Scanner() {
  const params = useSearchParams();
  const mealId = params.get("refeicao");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("data") ?? "") ? params.get("data")! : today();
  const meals = useQuery(keys.meals, listMeals);

  const video = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<() => void>(() => undefined);
  const [state, setState] = useState<State>({ kind: "starting" });
  const [manual, setManual] = useState("");
  const [attempt, setAttempt] = useState(0);

  const lookup = useCallback(async (raw: string) => {
    const code = normalizeBarcode(raw);
    if (!code) return;
    stopRef.current();
    navigator.vibrate?.(40);
    setState({ kind: "looking", code });
    try {
      const food = (await findByBarcodeLocal(code)) ?? (await barcodeExternal(code));
      setState(food ? { kind: "found", code, food } : { kind: "notfound", code });
    } catch (e) {
      setState({ kind: "error", message: errorMessage(e) });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    setState({ kind: "starting" });

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState({ kind: "error", message: "Este navegador não permite usar a câmera. Digite o código abaixo." });
        return;
      }
      try {
        if (window.BarcodeDetector) {
          // Caminho nativo (Chrome/Android, Safari recente): mais rápido e leve.
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: false });
          if (cancelled) return stream.getTracks().forEach((t) => t.stop());
          stopRef.current = () => {
            cancelAnimationFrame(raf);
            stream?.getTracks().forEach((tr) => tr.stop());
          };
          const v = video.current!;
          v.srcObject = stream;
          await v.play();
          if (cancelled) return stopRef.current();
          const detector = new window.BarcodeDetector({ formats: FORMATS });
          setState({ kind: "scanning" });
          let last = 0;
          const loop = async (t: number) => {
            if (cancelled) return;
            if (t - last > 180 && v.readyState >= 2) {
              last = t;
              try {
                const found = await detector.detect(v);
                if (found[0]?.rawValue) return void lookup(found[0].rawValue);
              } catch {}
            }
            raf = requestAnimationFrame(loop);
          };
          raf = requestAnimationFrame(loop);
        } else {
          // Alternativa em JavaScript (ZXing), carregada só quando necessário.
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          if (cancelled) return;
          const reader = new BrowserMultiFormatReader();
          const controls = await reader.decodeFromVideoDevice(undefined, video.current!, (result) => {
            if (result) void lookup(result.getText());
          });
          if (cancelled) return controls.stop();
          setState({ kind: "scanning" });
          stopRef.current = () => controls.stop();
        }
      } catch (e) {
        const name = (e as DOMException)?.name;
        setState({
          kind: "error",
          message:
            name === "NotAllowedError"
              ? "Sem permissão para usar a câmera. Libere o acesso nas configurações do navegador ou digite o código."
              : name === "NotFoundError"
                ? "Nenhuma câmera encontrada neste aparelho. Digite o código abaixo."
                : "Não foi possível abrir a câmera. Digite o código abaixo.",
        });
      }
    }
    void start();
    return () => {
      cancelled = true;
      stopRef.current();
    };
  }, [attempt, lookup]);

  const restart = () => setAttempt((n) => n + 1);
  const newHref = (code: string) => `/alimentos/novo?${new URLSearchParams({ barcode: code, ...(mealId ? { refeicao: mealId } : {}), ...(date !== today() ? { data: date } : {}) })}`;

  return (
    <main className="flex flex-col gap-4">
      <PageHeader title="Código de barras" back />

      <div className="relative aspect-[3/4] w-full max-w-md self-center overflow-hidden rounded-[28px] bg-black sm:aspect-video">
        <video ref={video} className="h-full w-full object-cover" playsInline muted aria-label="Imagem da câmera" />
        {(state.kind === "scanning" || state.kind === "starting") && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative h-32 w-[72%] rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]">
              <div className="absolute inset-x-3 top-1/2 h-0.5 bg-brand/90" />
            </div>
            <p className="absolute bottom-5 rounded-full bg-black/55 px-3 py-1.5 text-sm font-medium text-white">
              {state.kind === "starting" ? "Abrindo a câmera…" : "Aponte para o código de barras"}
            </p>
          </div>
        )}
        {state.kind === "looking" && (
          <div className="absolute inset-0 grid place-items-center bg-black/60 text-white">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm font-medium">Procurando {state.code}…</p>
            </div>
          </div>
        )}
        {state.kind === "error" && (
          <div className="absolute inset-0 grid place-items-center bg-surface p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <CameraOff className="h-8 w-8 text-muted" />
              <p className="max-w-[32ch] text-sm text-muted">{state.message}</p>
              <Button variant="secondary" size="sm" onClick={restart}>
                <RotateCcw className="h-4 w-4" /> Tentar de novo
              </Button>
            </div>
          </div>
        )}
      </div>

      {state.kind === "notfound" && (
        <Card>
          <EmptyState
            icon={<PackageX className="h-6 w-6" />}
            title="Produto não encontrado"
            text={`O código ${state.code} ainda não está na base de alimentos.`}
            action={
              <div className="flex flex-col items-center gap-2">
                <ButtonLink href={newHref(state.code)}>Cadastrar alimento</ButtonLink>
                <button onClick={restart} className="text-sm font-semibold text-muted">
                  Escanear outro
                </button>
              </div>
            }
          />
        </Card>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!normalizeBarcode(manual)) return setState({ kind: "error", message: "Código inválido. Use os 8 a 14 números abaixo das barras." });
          void lookup(manual);
        }}
      >
        <Input value={manual} onChange={(e) => setManual(e.target.value)} inputMode="numeric" placeholder="Ou digite o código" aria-label="Código de barras" />
        <Button type="submit" disabled={!manual}>
          Buscar
        </Button>
      </form>

      <AddFoodSheet
        food={state.kind === "found" ? state.food : null}
        meals={meals.data ?? []}
        mealId={mealId}
        date={date}
        onClose={restart}
      />
    </main>
  );
}
