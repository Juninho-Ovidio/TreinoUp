import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronDown, Flag, Pause, Play, Square, TriangleAlert } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { AppBackground, chrome, radius, Text, useTheme, useToast } from "@/design-system";
import { useMyProfile } from "@/features/profile/presentation/useProfile";
import { formatDistance, formatDuration, formatElevation, formatPace, formatSpeed } from "@/features/record/domain/format";
import { averageSpeedMs, currentSpeedMs, MILE, movingTimeMs, splitsWithPartial } from "@/features/record/domain/session";
import { autoPauseApplies, SPORTS } from "@/features/record/domain/sports";
import { HoldButton, Metric, RoundButton, SplitsList, StatusPill } from "@/features/record/presentation/components";
import { RouteMap } from "@/features/record/presentation/map/RouteMap";
import { ensureTracking, finishSession } from "@/features/record/presentation/sessionControl";
import { useNow, useRecordingState, useTrackPoints } from "@/features/record/presentation/useRecording";
import type { LocationAccess } from "@/features/record/services/locationTypes";
import { startMotionDetection } from "@/features/record/services/motion";
import { recorder } from "@/features/record/services/recorderInstance";
import { usePrefs } from "@/lib/prefs";

const KEEP_AWAKE_TAG = "treinoup-recording";

export default function RecordingScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const state = useRecordingState();
  const keepScreenOn = usePrefs((s) => s.keepScreenOn);
  const profileUnits = useMyProfile().data?.units ?? "metric";
  const [access, setAccess] = useState<LocationAccess | null>(null);
  const [page, setPage] = useState(0);
  const now = useNow(state?.status === "recording");
  const points = useTrackPoints();

  const active = !!state && state.status !== "finished";
  const sport = state ? SPORTS[state.sport] : null;
  const units = state ? (state.splitM === MILE ? "imperial" : "metric") : profileUnits;
  const id = state?.id;

  // Abre direto aqui (ex.: app reaberto): carrega a gravação e religa o GPS se precisar.
  useEffect(() => {
    let cancelled = false;
    recorder.load().then((s) => {
      if (cancelled) return;
      if (!s) router.replace("/run/record");
      else ensureTracking().then((a) => !cancelled && setAccess(a));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Finalizou: vai para o resumo.
  useEffect(() => {
    if (state?.status === "finished") router.replace("/run/summary");
  }, [state?.status]);

  // Tela ligada: se a pessoa pediu, ou se não há permissão em segundo plano (senão o GPS para).
  const keepAwake = active && (keepScreenOn || access === "foreground");
  useEffect(() => {
    if (!keepAwake) return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [keepAwake]);

  // Pausa automática da corrida usa o acelerômetro.
  const useMotion = active && !!state && autoPauseApplies(state.autoPause, state.sport) && SPORTS[state.sport].family === "foot";
  useEffect(() => {
    if (!useMotion) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    startMotionDetection().then((s) => (cancelled ? s() : (stop = s)));
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [useMotion, id]);

  if (!state || !sport) return <View style={[styles.root, { backgroundColor: colors.bg }]} />;

  const moving = movingTimeMs(state, now);
  const speedNow = currentSpeedMs(state);
  const speedAvg = averageSpeedMs(state, now);
  const isPace = sport.metric === "pace";
  const distUnit = t(units === "imperial" ? "rec.units.mi" : "rec.units.km");
  const paceUnit = t(units === "imperial" ? "rec.units.perMi" : "rec.units.perKm");
  const speedUnit = t(units === "imperial" ? "rec.units.mph" : "rec.units.kmh");
  const elevUnit = t(units === "imperial" ? "rec.units.ft" : "rec.units.m");
  const splits = splitsWithPartial(state, now);
  const pages = [t("rec.live.pageMetrics"), ...(sport.usesGps ? [t("rec.live.pageMap")] : []), t("rec.live.pageSplits")];

  async function onLap() {
    const s = await recorder.lap();
    if (s) toast.info(t("rec.live.lapDone", { n: s.laps.length }));
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <AppBackground />
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
        <View style={styles.top}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("rec.live.minimize")}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/run/record"))}
            hitSlop={8}
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.line }]}
          >
            <ChevronDown size={22} color={colors.fg} />
          </Pressable>
          <Text variant="heading" style={styles.flex} numberOfLines={1}>
            {t(`rec.sports.${state.sport}`)}
          </Text>
          <StatusPill status={state.status} autoPaused={state.pauseReason === "auto"} />
        </View>

        {access === "foreground" && sport.usesGps ? (
          <View style={[styles.warn, { backgroundColor: colors.brandSoft }]}>
            <TriangleAlert size={16} color={colors.brandText} />
            <Text variant="caption" color="brandText" style={styles.flex}>
              {t("rec.perm.foregroundOnly")}
            </Text>
          </View>
        ) : null}

        <View style={styles.tabs} accessibilityRole="tablist">
          {pages.map((p, i) => (
            <View key={p} style={[styles.tab, i === page && { backgroundColor: colors.brandSoft }]}>
              <Text variant="label" color={i === page ? "brandText" : "muted"}>
                {p}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          style={styles.flex}
        >
          <View style={[styles.page, { width }]}>
            <Metric label={t("rec.live.time")} value={formatDuration(moving)} big />
            <View style={styles.grid}>
              {sport.usesGps ? (
                <>
                  <Metric label={t("rec.live.distance")} value={formatDistance(state.distanceM, units, i18n.language)} unit={distUnit} />
                  {isPace ? (
                    <Metric label={t("rec.live.pace")} value={formatPace(speedNow, units)} unit={paceUnit} />
                  ) : (
                    <Metric label={t("rec.live.speed")} value={formatSpeed(speedNow, units, i18n.language)} unit={speedUnit} />
                  )}
                  {isPace ? (
                    <Metric label={t("rec.live.avgPace")} value={formatPace(speedAvg, units)} unit={paceUnit} />
                  ) : (
                    <Metric label={t("rec.live.avgSpeed")} value={formatSpeed(speedAvg, units, i18n.language)} unit={speedUnit} />
                  )}
                  <Metric label={t("rec.live.elevation")} value={formatElevation(state.elevation.gain, units, i18n.language)} unit={elevUnit} />
                </>
              ) : null}
            </View>
          </View>

          {sport.usesGps ? (
            <View style={[styles.page, { width }]}>
              <View style={[styles.mapBox, { borderColor: colors.line }]}>
                <RouteMap points={points} current={state.lastPoint} follow style={StyleSheet.absoluteFill} accessibilityLabel={t("rec.live.pageMap")} />
              </View>
            </View>
          ) : null}

          <ScrollView style={{ width }} contentContainerStyle={styles.page}>
            <SplitsList splits={splits} units={units} metric={sport.metric} />
          </ScrollView>
        </ScrollView>

        <SafeAreaView edges={["bottom"]} style={[styles.controls, { backgroundColor: chrome.glass, borderColor: chrome.border }]}>
          {state.status === "recording" ? (
            <>
              <RoundButton label={t("rec.live.lap")} icon={<Flag size={24} color={chrome.white} />} onPress={onLap} />
              <RoundButton
                label={t("rec.live.pause")}
                variant="primary"
                size={84}
                icon={<Pause size={32} color={chrome.graphite} fill={chrome.graphite} />}
                onPress={() => recorder.pause()}
              />
            </>
          ) : (
            <>
              <RoundButton
                label={t("rec.live.resume")}
                variant="primary"
                size={84}
                icon={<Play size={32} color={chrome.graphite} fill={chrome.graphite} />}
                onPress={() => recorder.resume()}
              />
              <HoldButton
                label={t("rec.live.finish")}
                hint={t("rec.live.holdToFinish")}
                icon={<Square size={24} color={chrome.white} fill={chrome.white} />}
                onConfirm={() => finishSession()}
              />
            </>
          )}
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  warn: { flexDirection: "row", gap: 8, marginHorizontal: 16, borderRadius: 12, padding: 10, alignItems: "center" },
  tabs: { flexDirection: "row", gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  tab: { borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  page: { paddingHorizontal: 20, paddingVertical: 12, gap: 24 },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 20, columnGap: 16 },
  mapBox: { height: 420, borderRadius: 20, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  controls: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "flex-start",
    paddingTop: 16,
    paddingHorizontal: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
  },
});
