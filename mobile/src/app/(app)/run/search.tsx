import { Search } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Card, EmptyState, Screen, useTheme } from "@/design-system";
import { StackTopBar } from "@/features/navigation/TopBar";

export default function SearchScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Screen header={<StackTopBar title={t("search.title")} />}>
      <Card>
        <EmptyState
          icon={<Search size={28} color={colors.brandText} />}
          badge={t("common.soon")}
          title={t("search.emptyTitle")}
          text={t("search.emptyText")}
        />
      </Card>
    </Screen>
  );
}
