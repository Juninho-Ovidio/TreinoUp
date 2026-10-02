import { StyleSheet, View } from "react-native";
import { Activity, CloudUpload } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Card, Divider, EmptyState, Skeleton, Text, useTheme } from "@/design-system";
import { formatDistance, formatDuration } from "../domain/format";
import { MILE } from "../domain/session";
import { SPORTS } from "../domain/sports";
import { SPORT_ICONS } from "./components";
import { useLocalActivities } from "./useLocalActivities";

/** Atividades salvas no aparelho, da mais recente para a mais antiga. */
export function LocalActivityList() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { data, isPending } = useLocalActivities();

  if (isPending) {
    return (
      <Card style={styles.loading}>
        <Skeleton height={18} width="60%" />
        <Skeleton height={14} width="40%" />
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card>
        <EmptyState icon={<Activity size={28} color={colors.brandText} />} title={t("rec.history.title")} text={t("rec.history.empty")} />
      </Card>
    );
  }

  const date = new Intl.DateTimeFormat(i18n.language, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <Card style={styles.list}>
      {data.map((a, i) => {
        const sport = a.meta?.sport ?? a.state.sport;
        const Icon = SPORT_ICONS[sport];
        const units = a.state.splitM === MILE ? "imperial" : "metric";
        const parts = [
          SPORTS[sport].usesGps
            ? `${formatDistance(a.state.distanceM, units, i18n.language)} ${t(units === "imperial" ? "rec.units.mi" : "rec.units.km")}`
            : null,
          formatDuration(a.state.movingMs),
        ].filter(Boolean);
        return (
          <View key={a.id}>
            {i > 0 ? <Divider /> : null}
            <View style={styles.row} accessible accessibilityLabel={`${a.meta?.title ?? ""}, ${parts.join(", ")}`}>
              <View style={[styles.icon, { backgroundColor: colors.brandSoft }]}>
                <Icon size={20} color={colors.brandText} />
              </View>
              <View style={styles.text}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {a.meta?.title ?? t(`rec.sports.${sport}`)}
                </Text>
                <Text variant="caption" color="muted" numberOfLines={1}>
                  {date.format(new Date(a.state.startedAt))} · {parts.join(" · ")}
                </Text>
                <View style={styles.pending}>
                  <CloudUpload size={12} color={colors.muted} />
                  <Text variant="caption" color="muted">
                    {t("rec.history.pending")}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  loading: { gap: 8 },
  list: { paddingVertical: 4, paddingHorizontal: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  icon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 2 },
  pending: { flexDirection: "row", alignItems: "center", gap: 4 },
});
