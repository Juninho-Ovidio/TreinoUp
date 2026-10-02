import { useQuery } from "@tanstack/react-query";
import { recordingStore } from "../data/recordingStore";

export const localActivitiesKey = ["local-activities"] as const;

/** Atividades salvas no aparelho (o envio ao servidor chega na Fase 2). */
export function useLocalActivities() {
  return useQuery({ queryKey: localActivitiesKey, queryFn: () => recordingStore.listSaved(), staleTime: 0 });
}
