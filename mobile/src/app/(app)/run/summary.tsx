import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, Card, Screen, SectionTitle, Segmented, Text, TextField, useTheme, useToast } from "@/design-system";
import { StackTopBar } from "@/features/navigation/TopBar";
import type { ActivityVisibility } from "@/features/record/data/types";
import { dayPeriod, formatDistance, formatDuration, formatElevation, formatPace, formatSpeed } from "@/features/record/domain/format";
import { averageSpeedMs, elapsedTimeMs, MILE, splitsWithPartial } from "@/features/record/domain/session";
import { SPORTS, type SportId } from "@/features/record/domain/sports";
import { Metric, SportPicker, SplitsList } from "@/features/record/presentation/components";
import { RouteMap } from "@/features/record/presentation/map/RouteMap";
import { discardSession, saveSession } from "@/features/record/presentation/sessionControl";
import { useRecordingState, useTrackPoints } from "@/features/record/presentation/useRecording";
import { recorder } from "@/features/record/services/recorderInstance";
import { localActivitiesKey } from "@/features/record/presentation/useLocalActivities";
import { tap } from "@/lib/haptics";

function confirm(title: string, message: string, ok: string, cancel: string): Promise<boolean> {
  if (Platform.OS === "web") return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: cancel, style: "cancel", onPress: () => resolve(false) },
      { text: ok, style: "destructive", onPress: () => resolve(true) },
    ]),
  );
}

export default function SummaryScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const state = useRecordingState();
  const points = useTrackPoints();

  const [title, setTitle] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [sport, setSport] = useState<SportId | null>(null);
  const [effort, setEffort] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<ActivityVisibility>("followers");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    recorder.load().then((s) => {
      if (!s) router.replace("/run/record");
      else if (s.status !== "finished") router.replace("/run/recording");
    });
  }, []);

  if (!state || state.status !== "finished") return <Screen>{null}</Screen>;

  const chosenSport = sport ?? state.sport;
  const autoTitle = t("rec.summary.autoTitle", {
    sport: t(`rec.sports.${chosenSport}`),
    period: t(`rec.summary.periods.${dayPeriod(new Date(state.startedAt).getHours())}`),
  });
  const units = state.splitM === MILE ? "imperial" : "metric";
  const end = state.finishedAt ?? state.startedAt;
  const avg = averageSpeedMs(state, end);
  const isPace = SPORTS[chosenSport].metric === "pace";
  const usesGps = SPORTS[state.sport].usesGps;

  async function onSave() {
    setBusy(true);
    try {
      await saveSession({
        title: (title ?? autoTitle).trim() || autoTitle,
        description: description.trim(),
        sport: chosenSport,
        perceivedEffort: effort,
        visibility,
      });
      await qc.invalidateQueries({ queryKey: localActivitiesKey });
      toast.success(t("rec.summary.saved"));
      router.replace("/run/you");
    } catch {
      toast.error(t("common.errorGeneric"));
      setBusy(false);
    }
  }

  async function onDiscard() {
    const ok = await confirm(t("rec.summary.discardTitle"), t("rec.summary.discardText"), t("rec.summary.discard"), t("common.cancel"));
    if (!ok) return;
    await discardSession();
    router.replace("/run/record");
  }

  return (
    <Screen header={<StackTopBar title={t("rec.summary.title")} />}>
      {usesGps && points.length > 1 ? (
        <View style={[styles.map, { borderColor: colors.line }]}>
          <RouteMap points={points} interactive={false} style={StyleSheet.absoluteFill} accessibilityLabel={t("rec.live.pageMap")} />
        </View>
      ) : null}

      <Card style={styles.stats}>
        {usesGps ? (
          <Metric
            label={t("rec.live.distance")}
            value={formatDistance(state.distanceM, units, i18n.language)}
            unit={t(units === "imperial" ? "rec.units.mi" : "rec.units.km")}
          />
        ) : null}
        <Metric label={t("rec.summary.movingTime")} value={formatDuration(state.movingMs)} />
        {usesGps ? (
          isPace ? (
            <Metric label={t("rec.live.avgPace")} value={formatPace(avg, units)} unit={t(units === "imperial" ? "rec.units.perMi" : "rec.units.perKm")} />
          ) : (
            <Metric
              label={t("rec.live.avgSpeed")}
              value={formatSpeed(avg, units, i18n.language)}
              unit={t(units === "imperial" ? "rec.units.mph" : "rec.units.kmh")}
            />
          )
        ) : null}
        {usesGps ? (
          <Metric
            label={t("rec.live.elevation")}
            value={formatElevation(state.elevation.gain, units, i18n.language)}
            unit={t(units === "imperial" ? "rec.units.ft" : "rec.units.m")}
          />
        ) : null}
        <Metric label={t("rec.summary.elapsedTime")} value={formatDuration(elapsedTimeMs(state, end))} />
      </Card>

      {usesGps ? (
        <>
          <SectionTitle>{t("rec.live.splits")}</SectionTitle>
          <Card>
            <SplitsList splits={splitsWithPartial(state, end)} units={units} metric={SPORTS[chosenSport].metric} />
          </Card>
        </>
      ) : null}

      <TextField label={t("rec.summary.name")} value={title ?? autoTitle} onChangeText={setTitle} maxLength={100} />
      <TextField
        label={t("rec.summary.description")}
        value={description}
        onChangeText={setDescription}
        placeholder={t("rec.summary.descriptionPlaceholder")}
        multiline
        maxLength={2000}
      />

      <Text variant="label" color="muted">
        {t("rec.pre.sport")}
      </Text>
      <SportPicker value={chosenSport} onChange={setSport} />

      <View style={styles.block}>
        <Text variant="label" color="muted">
          {t("rec.summary.effort")}
        </Text>
        <View style={styles.effort} accessibilityRole="radiogroup" accessibilityLabel={t("rec.summary.effort")}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
            const selected = effort === n;
            return (
              <Pressable
                key={n}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={String(n)}
                onPress={() => {
                  tap();
                  setEffort(selected ? null : n);
                }}
                style={[
                  styles.effortItem,
                  { backgroundColor: selected ? colors.brand : colors.surface, borderColor: selected ? colors.brand : colors.line },
                ]}
              >
                <Text variant="bodyStrong" style={{ color: selected ? colors.onBrand : colors.fg }}>
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text variant="caption" color="muted">
          {t("rec.summary.effortHint")}
        </Text>
      </View>

      <View style={styles.block}>
        <Text variant="label" color="muted">
          {t("rec.summary.visibility")}
        </Text>
        <Segmented<ActivityVisibility>
          accessibilityLabel={t("rec.summary.visibility")}
          value={visibility}
          onChange={setVisibility}
          options={[
            { value: "everyone", label: t("rec.summary.visEveryone") },
            { value: "followers", label: t("rec.summary.visFollowers") },
            { value: "only_me", label: t("rec.summary.visOnlyMe") },
          ]}
        />
      </View>

      <Button size="lg" block label={t("rec.summary.save")} loading={busy} onPress={onSave} />
      <Button size="lg" block variant="ghost" label={t("rec.summary.discard")} disabled={busy} onPress={onDiscard} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: { height: 220, borderRadius: 20, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  stats: { flexDirection: "row", flexWrap: "wrap", rowGap: 18, columnGap: 16 },
  block: { gap: 8 },
  effort: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  effortItem: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
