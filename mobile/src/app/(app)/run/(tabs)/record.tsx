import { useCallback, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Info, LocateFixed, MapPinOff, Play, Radio } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Button, Card, chrome, fonts, Segmented, Text, useTheme, useToast } from "@/design-system";
import { useMyProfile } from "@/features/profile/presentation/useProfile";
import { TabScreen } from "@/features/navigation/TabScreen";
import { SPORTS, type AutoPauseMode, type SportId } from "@/features/record/domain/sports";
import { SportPicker, ToggleRow } from "@/features/record/presentation/components";
import { RouteMap } from "@/features/record/presentation/map/RouteMap";
import { startSession } from "@/features/record/presentation/sessionControl";
import { useGpsPreview, type GpsQuality } from "@/features/record/presentation/useGpsPreview";
import { useRecordingState } from "@/features/record/presentation/useRecording";
import { currentAccess, openSettings, requestAccess } from "@/features/record/services/locationTracking";
import type { LocationAccess } from "@/features/record/services/locationTypes";
import { recorder } from "@/features/record/services/recorderInstance";
import { tap } from "@/lib/haptics";
import { usePrefs } from "@/lib/prefs";

const QUALITY_COLOR: Record<GpsQuality, string> = {
  off: "#A0A0A0",
  searching: "#E8A33D",
  good: "#4CC38A",
  ok: "#4CC38A",
  weak: "#F0892F",
};

export default function RecordScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const units = useMyProfile().data?.units ?? "metric";
  const sport = usePrefs((s) => s.lastSport);
  const setSport = usePrefs((s) => s.setLastSport);
  const autoPause = usePrefs((s) => s.autoPause);
  const setAutoPause = usePrefs((s) => s.setAutoPause);
  const voiceCues = usePrefs((s) => s.voiceCues);
  const setVoiceCues = usePrefs((s) => s.setVoiceCues);
  const keepScreenOn = usePrefs((s) => s.keepScreenOn);
  const setKeepScreenOn = usePrefs((s) => s.setKeepScreenOn);
  const [access, setAccess] = useState<LocationAccess | null>(null);
  const [starting, setStarting] = useState(false);
  const ongoing = useRecordingState();
  const usesGps = SPORTS[sport].usesGps;
  const gps = useGpsPreview(usesGps && access != null && access !== "denied");

  // Carrega uma gravação em andamento (ex.: app reaberto) para mostrar o atalho de volta a ela.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      recorder.load();
      currentAccess().then((a) => active && setAccess(a));
      return () => {
        active = false;
      };
    }, []),
  );

  async function askPermission(): Promise<LocationAccess> {
    const a = await requestAccess();
    setAccess(a);
    if (a === "denied") toast.error(t("rec.perm.denied"));
    else if (a === "foreground" && Platform.OS !== "web") toast.info(t("rec.perm.foregroundOnly"));
    return a;
  }

  async function start() {
    if (starting) return;
    setStarting(true);
    try {
      let a = access ?? (await currentAccess());
      if (usesGps && a === "denied") a = await askPermission();
      if (usesGps && a === "denied") return;
      await startSession(sport, a, units);
      router.push("/run/recording");
    } catch {
      toast.error(t("common.errorGeneric"));
    } finally {
      setStarting(false);
    }
  }

  return (
    <TabScreen title={t("record.title")}>
      {ongoing ? (
        <Card style={styles.ongoing}>
          <View style={styles.permHead}>
            <Radio size={22} color={colors.brandText} />
            <Text variant="heading" style={styles.flex}>
              {ongoing.status === "finished" ? t("rec.live.pendingSummary") : t("rec.live.inProgress")}
            </Text>
          </View>
          <Button
            block
            label={ongoing.status === "finished" ? t("rec.live.openSummary") : t("rec.live.backToRecording")}
            onPress={() => router.push(ongoing.status === "finished" ? "/run/summary" : "/run/recording")}
          />
        </Card>
      ) : null}
      <View style={[styles.mapCard, { borderColor: colors.line }]}>
        {usesGps ? (
          <RouteMap
            points={[]}
            current={gps.position}
            follow
            interactive={false}
            style={StyleSheet.absoluteFill}
            accessibilityLabel={t("maps.title")}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.noGps, { backgroundColor: colors.surface2 }]}>
            <MapPinOff size={28} color={colors.muted} />
          </View>
        )}
        <View style={[styles.gpsBadge, { backgroundColor: chrome.glass }]}>
          <View style={[styles.gpsDot, { backgroundColor: usesGps ? QUALITY_COLOR[gps.quality] : QUALITY_COLOR.off }]} />
          <Text variant="label" style={styles.gpsText}>
            {!usesGps ? t("rec.gps.none") : access === "denied" ? t("rec.gps.off") : t(`rec.gps.${gps.quality}`)}
          </Text>
        </View>
      </View>

      {usesGps && access === "denied" ? (
        <Card style={styles.perm}>
          <View style={styles.permHead}>
            <LocateFixed size={22} color={colors.brandText} />
            <Text variant="heading" style={styles.flex}>
              {t("rec.perm.title")}
            </Text>
          </View>
          <Text variant="body" color="muted">
            {t("rec.perm.text")}
          </Text>
          <View style={styles.permActions}>
            <Button label={t("rec.perm.allow")} onPress={askPermission} />
            {Platform.OS !== "web" ? <Button variant="ghost" label={t("rec.perm.openSettings")} onPress={openSettings} /> : null}
          </View>
        </Card>
      ) : null}

      <Text variant="overline" color="muted">
        {t("rec.pre.sport")}
      </Text>
      <SportPicker value={sport} onChange={(s: SportId) => setSport(s)} />

      <Card style={styles.settings}>
        <Text variant="label" color="muted">
          {t("rec.pre.autoPause")}
        </Text>
        <Segmented<AutoPauseMode>
          accessibilityLabel={t("rec.pre.autoPause")}
          value={autoPause}
          onChange={setAutoPause}
          options={[
            { value: "off", label: t("rec.pre.autoPauseOff") },
            { value: "foot", label: t("rec.pre.autoPauseFoot") },
            { value: "ride", label: t("rec.pre.autoPauseRide") },
          ]}
        />
        <ToggleRow label={t("rec.pre.voice")} value={voiceCues} onChange={setVoiceCues} />
        <ToggleRow label={t("rec.pre.keepScreenOn")} value={keepScreenOn} onChange={setKeepScreenOn} />
      </Card>

      {Platform.OS === "web" ? (
        <View style={[styles.note, { backgroundColor: colors.brandSoft }]}>
          <Info size={18} color={colors.brandText} />
          <Text variant="caption" color="brandText" style={styles.flex}>
            {t("rec.pre.webNote")}
          </Text>
        </View>
      ) : null}

      {ongoing ? null : (
      <View style={styles.startWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("rec.pre.start")}
          accessibilityState={{ busy: starting, disabled: starting }}
          disabled={starting}
          onPress={() => {
            tap();
            start();
          }}
          style={({ pressed }) => [styles.start, { transform: [{ scale: pressed ? 0.95 : 1 }], opacity: starting ? 0.7 : 1 }]}
        >
          <LinearGradient colors={["#F7C870", chrome.goldDeep]} style={[StyleSheet.absoluteFill, styles.startFill]} />
          <View style={styles.above}>
            <Play size={30} color={chrome.graphite} strokeWidth={2.6} />
          </View>
        </Pressable>
        <Text style={styles.startLabel}>{t("rec.pre.start")}</Text>
      </View>
      )}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mapCard: { height: 220, borderRadius: 20, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  noGps: { alignItems: "center", justifyContent: "center" },
  gpsBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  gpsDot: { width: 10, height: 10, borderRadius: 5 },
  gpsText: { color: chrome.white },
  perm: { gap: 10 },
  ongoing: { gap: 12 },
  permHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  permActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  settings: { gap: 10 },
  note: { flexDirection: "row", gap: 10, borderRadius: 16, padding: 12, alignItems: "flex-start" },
  startWrap: { alignItems: "center", gap: 8, paddingTop: 4 },
  start: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  startFill: { borderRadius: 42 },
  startLabel: { fontFamily: fonts.bold, fontSize: 16 },
  above: { position: "relative", zIndex: 1, marginLeft: 4 },
});
