import { Bell } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Card, EmptyState, Screen, useTheme } from "@/design-system";
import { StackTopBar } from "@/features/navigation/TopBar";

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Screen header={<StackTopBar title={t("notifications.title")} />}>
      <Card>
        <EmptyState
          icon={<Bell size={28} color={colors.brandText} />}
          title={t("notifications.emptyTitle")}
          text={t("notifications.emptyText")}
        />
      </Card>
    </Screen>
  );
}
