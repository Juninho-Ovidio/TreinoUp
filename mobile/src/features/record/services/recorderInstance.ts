import * as Crypto from "expo-crypto";
import { recordingStore } from "../data/recordingStore";
import { createRecorder } from "../engine/recorder";
import { announceEffects } from "./voice";

/**
 * Motor único do app. A tarefa de GPS em segundo plano e as telas usam este mesmo objeto;
 * o id vira o `client_activity_id` do envio (Fase 2), evitando duplicatas.
 */
export const recorder = createRecorder({
  store: recordingStore,
  now: () => Date.now(),
  newId: () => Crypto.randomUUID(),
  onEffects: announceEffects,
});
