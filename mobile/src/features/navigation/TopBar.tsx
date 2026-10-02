import { Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Bell, ChevronLeft, Search, Settings } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { chrome, HeaderBar, HeaderButton, LogoMark } from "@/design-system";

/** Sai do TreinoUp Run e volta para a tela inicial do TreinoUp. */
export function backToTreinoUp() {
  if (router.canDismiss()) router.dismissTo("/");
  else router.replace("/");
}

/** Botão "‹ símbolo do Run" que leva de volta ao TreinoUp. */
function BackToTreinoUp() {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("header.backToTreinoUp")}
      onPress={backToTreinoUp}
      hitSlop={6}
      style={({ pressed }) => [styles.back, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
    >
      <ChevronLeft size={20} color={chrome.gold} />
      <LogoMark size={36} />
    </Pressable>
  );
}

/** Cabeçalho das abas do Run: voltar ao TreinoUp + título + Buscar, Notificações e Configurações. */
export function TabTopBar({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <HeaderBar
      title={title}
      left={<BackToTreinoUp />}
      right={
        <>
          <HeaderButton outlined label={t("header.search")} onPress={() => router.push("/run/search")}>
            <Search size={20} color={chrome.gold} />
          </HeaderButton>
          <HeaderButton outlined label={t("header.notifications")} onPress={() => router.push("/run/notifications")}>
            <Bell size={20} color={chrome.gold} />
          </HeaderButton>
          <HeaderButton outlined label={t("header.settings")} onPress={() => router.push("/settings")}>
            <Settings size={20} color={chrome.gold} />
          </HeaderButton>
        </>
      }
    />
  );
}

/** Cabeçalho das telas empilhadas (Configurações, Editar perfil…): voltar + título. */
export function StackTopBar({ title, right }: { title: string; right?: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <HeaderBar
      title={title}
      left={
        <HeaderButton
          label={t("common.back")}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        >
          <ChevronLeft size={22} color={chrome.white} />
        </HeaderButton>
      }
      right={right}
    />
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44 },
});
