import { router } from "expo-router";
import { Footprints } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Button, Card, EmptyState, useTheme } from "@/design-system";
import { profileLabel } from "@/features/profile/domain/profile";
import { useMyProfile } from "@/features/profile/presentation/useProfile";
import { TabScreen } from "@/features/navigation/TabScreen";

/** Início do Run: o feed chega na Fase 3. Por enquanto, o estado vazio convida a seguir pessoas. */
export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const profile = useMyProfile().data;
  const name = profile?.name?.split(" ")[0] || profileLabel(profile);

  return (
    <TabScreen title={name ? t("home.greeting", { name }) : t("tabs.home")}>
      <Card>
        <EmptyState
          icon={<Footprints size={28} color={colors.brandText} />}
          title={t("home.emptyTitle")}
          text={t("home.emptyText")}
          action={<Button variant="soft" label={t("home.findFriends")} onPress={() => router.push("/run/search")} />}
        />
      </Card>
    </TabScreen>
  );
}
