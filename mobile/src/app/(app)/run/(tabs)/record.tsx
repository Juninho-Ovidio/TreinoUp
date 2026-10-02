import { Route } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Card, EmptyState, Text, useTheme } from "@/design-system";
import { TabScreen } from "@/features/navigation/TabScreen";

export default function RecordScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <TabScreen title={t("record.title")}>
      <Card>
        <EmptyState
          icon={<Route size={28} color={colors.brandText} />}
          badge={t("common.soon")}
          title={t("record.emptyTitle")}
          text={t("record.emptyText")}
          action={
            <Text variant="label" color="muted">
              {t("record.sports")}
            </Text>
          }
        />
      </Card>
    </TabScreen>
  );
}
