import { Screen } from "@/design-system";
import { DOCK_GAP, DOCK_HEIGHT } from "./Dock";
import { TabTopBar } from "./TopBar";

/** Tela de aba do Run: cabeçalho grafite + conteúdo rolável com espaço para o dock. */
export function TabScreen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Screen header={<TabTopBar title={title} />} bottomInset={DOCK_HEIGHT + DOCK_GAP * 2}>
      {children}
    </Screen>
  );
}
