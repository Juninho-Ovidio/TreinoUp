import { Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Redirect, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BookOpen, ChevronRight, Flame, Settings, Target, UserRound } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  Button,
  Card,
  chrome,
  EmptyState,
  fonts,
  HeaderBar,
  HeaderButton,
  LogoMark,
  ProgressBar,
  radius,
  Ring,
  Screen,
  SectionTitle,
  Skeleton,
  Text,
  useTheme,
} from "@/design-system";
import { profileLabel } from "@/features/profile/domain/profile";
import { useMyProfile } from "@/features/profile/presentation/useProfile";
import { greetingKey, percentOf, type DaySummary } from "@/features/today/domain/summary";
import { useTodaySummary } from "@/features/today/presentation/useToday";
import { webEmbedded } from "@/lib/webEmbed";

/** Cores dos macros, as mesmas do TreinoUp web. */
const MACRO_COLORS = { protein: "#3B82F6", carbs: "#E8A33D", fat: "#E0678B", water: "#3AA6E8" } as const;

/** Tela inicial do TreinoUp: resumo do dia (mesmo banco do site) e a porta de entrada do TreinoUp Run. */
export default function TreinoUpHome() {
  // Dentro do site, a tela inicial é a do próprio site: o app abre direto no Run.
  if (webEmbedded) return <Redirect href="/run" />;
  return <TreinoUpHomeScreen />;
}

function TreinoUpHomeScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const profile = useMyProfile().data;
  const today = useTodaySummary();
  const name = profile?.name?.trim().split(/\s+/)[0] ?? "";
  const fmt = (n: number) => Math.round(n).toLocaleString(i18n.language);

  return (
    <Screen
      header={
        <HeaderBar
          left={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("settings.editProfile")}
              onPress={() => router.push("/edit-profile")}
              style={styles.avatar}
            >
              {profile?.avatar_url ? (
                <Avatar uri={profile.avatar_url} name={profileLabel(profile)} size={44} ring />
              ) : (
                <UserRound size={22} color={chrome.gold} />
              )}
            </Pressable>
          }
          title={`${t(greetingKey(new Date().getHours()))}${name ? `, ${name}` : ""}`}
          subtitle={t("today.subtitle")}
          right={
            <HeaderButton outlined label={t("header.settings")} onPress={() => router.push("/settings")}>
              <Settings size={20} color={chrome.gold} />
            </HeaderButton>
          }
        />
      }
      refreshControl={
        <RefreshControl refreshing={today.isRefetching} onRefresh={() => today.refetch()} tintColor={colors.brandText} />
      }
    >
      {today.isPending ? (
        <Card style={styles.center}>
          <Skeleton width={176} height={176} rounded={88} />
          <Skeleton height={14} width="70%" />
        </Card>
      ) : today.data?.hasGoal ? (
        <DayCard summary={today.data} fmt={fmt} />
      ) : (
        <Card>
          <EmptyState
            icon={<Target size={28} color={colors.brandText} />}
            title={t("today.noGoalTitle")}
            text={today.isError ? t("common.errorGeneric") : t("today.noGoalText")}
            action={today.isError ? <Button variant="soft" label={t("common.retry")} onPress={() => today.refetch()} /> : undefined}
          />
        </Card>
      )}

      <RunCard />

      <SectionTitle>{t("today.moreTitle")}</SectionTitle>
      <Card style={styles.more}>
        <View style={[styles.moreIcon, { backgroundColor: colors.brandSoft }]}>
          <BookOpen size={22} color={colors.brandText} />
        </View>
        <View style={styles.moreText}>
          <Text variant="bodyStrong">{t("today.moreTitle")}</Text>
          <Text variant="caption" color="muted">
            {t("today.moreText")}
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

function DayCard({ summary, fmt }: { summary: DaySummary; fmt: (n: number) => string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const over = summary.remaining < 0;
  const goal = summary.goal!;
  const macros = [
    { key: "protein", label: t("today.protein"), value: summary.protein, goal: goal.protein_g, unit: "g" },
    { key: "carbs", label: t("today.carbs"), value: summary.carbs, goal: goal.carbs_g, unit: "g" },
    { key: "fat", label: t("today.fat"), value: summary.fat, goal: goal.fat_g, unit: "g" },
    { key: "water", label: t("today.water"), value: summary.waterMl, goal: goal.water_ml, unit: "ml" },
  ] as const;

  return (
    <Card style={styles.day}>
      <SectionTitle>{t("today.caloriesTitle")}</SectionTitle>
      <View style={styles.center}>
        <Ring value={summary.kcal} max={summary.budget} accessibilityLabel={t("today.caloriesLabel")}>
          <Text style={styles.ringValue}>{fmt(summary.kcal)}</Text>
          <Text variant="caption" color="muted">
            {t("today.ofBudget", { budget: fmt(summary.budget) })}
          </Text>
          <View style={[styles.pill, { backgroundColor: over ? colors.dangerSoft : colors.brandSoft }]}>
            <Text variant="caption" color={over ? "danger" : "brandText"} style={styles.pillText}>
              {percentOf(summary.kcal, summary.budget)}%
            </Text>
          </View>
        </Ring>
      </View>

      <View style={styles.stats}>
        <Stat label={t("today.consumed")} value={fmt(summary.kcal)} />
        <Stat
          label={t("today.goal")}
          value={fmt(goal.kcal)}
          extra={summary.burned > 0 ? t("today.burned", { kcal: fmt(summary.burned) }) : undefined}
        />
        <Stat label={over ? t("today.over") : t("today.remaining")} value={fmt(Math.abs(summary.remaining))} tone={over ? "danger" : "brandText"} />
      </View>

      <View style={styles.macros}>
        {macros.map((m) => (
          <View key={m.key} style={styles.macro}>
            <View style={styles.macroHead}>
              <Text variant="label">{m.label}</Text>
              <Text variant="caption" color="muted" style={styles.tabular}>
                {fmt(m.value)} / {fmt(m.goal)} {m.unit}
              </Text>
            </View>
            <ProgressBar value={m.value} max={m.goal} color={MACRO_COLORS[m.key]} accessibilityLabel={m.label} />
          </View>
        ))}
      </View>
    </Card>
  );
}

function Stat({ label, value, extra, tone }: { label: string; value: string; extra?: string; tone?: "brandText" | "danger" }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface2 }]}>
      <Text variant="overline" color="muted" style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="metricSmall" color={tone ?? "fg"}>
        {value} <Text variant="caption" color="muted">kcal</Text>
      </Text>
      {extra ? (
        <View style={styles.extra}>
          <Flame size={12} color={colors.warn} />
          <Text variant="caption" color="muted" style={styles.extraText}>
            {extra}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Cartão grafite que abre o TreinoUp Run. */
function RunCard() {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("today.runCta")}
      onPress={() => router.push("/run")}
      style={({ pressed }) => [styles.run, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <LinearGradient
        colors={["rgba(232,163,61,0.22)", "transparent"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["transparent", "rgba(255,210,122,0.5)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.goldLine}
        pointerEvents="none"
      />
      <View style={styles.runRow}>
        <LogoMark size={56} />
        <View style={styles.runText}>
          <Text style={styles.runTitle}>
            Treino<Text style={[styles.runTitle, { color: chrome.gold }]}>Up</Text> Run
          </Text>
          <Text variant="caption" style={styles.runSub}>
            {t("today.runText")}
          </Text>
        </View>
      </View>
      <View style={styles.runCta}>
        <LinearGradient colors={["#F7C870", chrome.goldDeep]} style={[StyleSheet.absoluteFill, styles.runCtaFill]} />
        <Text variant="bodyStrong" style={styles.runCtaText}>
          {t("today.runCta")}
        </Text>
        <View style={styles.runCtaIcon}>
          <ChevronRight size={20} color={chrome.graphite} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: chrome.graphite,
    borderWidth: 2,
    borderColor: "rgba(255,210,122,0.8)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  center: { alignItems: "center", gap: 12 },
  day: { gap: 16 },
  ringValue: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, fontVariant: ["tabular-nums"] },
  pill: { marginTop: 6, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  pillText: { fontFamily: fonts.bold },
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 6, alignItems: "center", gap: 2 },
  statLabel: { fontSize: 10, letterSpacing: 0.6 },
  extra: { flexDirection: "row", alignItems: "center", gap: 2 },
  extraText: { fontSize: 11 },
  macros: { gap: 12 },
  macro: { gap: 6 },
  macroHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  tabular: { fontVariant: ["tabular-nums"] },
  run: {
    borderRadius: radius.dock,
    backgroundColor: chrome.graphite,
    borderWidth: 1,
    borderColor: chrome.border,
    padding: 18,
    gap: 16,
    overflow: "hidden",
  },
  goldLine: { position: "absolute", top: 0, left: 48, right: 48, height: 1 },
  runRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  runText: { flex: 1, gap: 4 },
  runTitle: { fontFamily: fonts.display, fontSize: 22, color: chrome.white },
  runSub: { color: "rgba(255,255,255,0.75)", fontSize: 13, lineHeight: 18 },
  runCta: {
    height: 50,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    overflow: "hidden",
  },
  runCtaFill: { borderRadius: radius.full },
  runCtaText: { color: chrome.graphite, fontFamily: fonts.bold, position: "relative", zIndex: 1 },
  runCtaIcon: { position: "relative", zIndex: 1, marginLeft: 4 },
  more: { flexDirection: "row", alignItems: "center", gap: 14 },
  moreIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  moreText: { flex: 1, gap: 2 },
});
