import { MapPin } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Card, EmptyState, useTheme } from "@/design-system";
import { TabScreen } from "@/features/navigation/TabScreen";

export default function MapsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <TabScreen title={t("maps.title")}>
      <Card>
        <EmptyState
          icon={<MapPin size={28} color={colors.brandText} />}
          badge={t("common.soon")}
          title={t("maps.emptyTitle")}
          text={t("maps.emptyText")}
        />
      </Card>
    </TabScreen>
  );
}
