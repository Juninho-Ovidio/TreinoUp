import { Trophy } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Card, EmptyState, useTheme } from "@/design-system";
import { TabScreen } from "@/features/navigation/TabScreen";

export default function GroupsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <TabScreen title={t("groups.title")}>
      <Card>
        <EmptyState
          icon={<Trophy size={28} color={colors.brandText} />}
          badge={t("common.soon")}
          title={t("groups.emptyTitle")}
          text={t("groups.emptyText")}
        />
      </Card>
    </TabScreen>
  );
}
