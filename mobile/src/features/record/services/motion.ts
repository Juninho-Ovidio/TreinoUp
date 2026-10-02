import { Accelerometer } from "expo-sensors";
import { isShaking } from "../domain/autoPause";
import { recorder } from "./recorderInstance";

/**
 * Pausa automática da corrida: lê o acelerômetro (10 Hz), calcula se o aparelho está balançando
 * nos últimos ~2 s e manda um evento por segundo para a gravação.
 * Retorna a função que desliga o sensor.
 */
export async function startMotionDetection(): Promise<() => void> {
  const available = await Accelerometer.isAvailableAsync().catch(() => false);
  if (!available) return () => {};
  const window: number[] = [];
  let count = 0;
  Accelerometer.setUpdateInterval(100);
  const sub = Accelerometer.addListener(({ x, y, z }) => {
    window.push(Math.sqrt(x * x + y * y + z * z));
    if (window.length > 20) window.shift();
    if (++count % 10 === 0) {
      const shaking = isShaking(window);
      if (shaking != null) recorder.dispatch([{ type: "motion", t: Date.now(), shaking }]);
    }
  });
  return () => sub.remove();
}
