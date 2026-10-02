import { useQuery } from "@tanstack/react-query";
import { useUserId } from "@/features/auth/presentation/useSession";
import { fetchDaySummary } from "../data/todayRepository";
import { localISODate } from "../domain/summary";

export function useTodaySummary() {
  const userId = useUserId();
  const date = localISODate();
  return useQuery({
    queryKey: ["today", userId, date],
    queryFn: () => fetchDaySummary(userId!, date),
    enabled: !!userId,
    // O diário é atualizado pelo site também: busca de novo ao voltar para a tela.
    staleTime: 30_000,
  });
}
