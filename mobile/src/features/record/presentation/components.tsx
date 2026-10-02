import { useRef, useState } from "react";
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Bike, Dumbbell, Footprints, Mountain, MoreHorizontal, Waves, type LucideIcon } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { chrome, fonts, radius, Text, useTheme } from "@/design-system";
import { tap } from "@/lib/haptics";
import { formatDistance, formatDuration, formatPace, formatSpeed, type Units } from "../domain/format";
import type { Split } from "../domain/session";
import { SPORT_IDS, SPORTS, type SportId } from "../domain/sports";

export const SPORT_ICONS: Record<SportId, LucideIcon> = {
  run: Footprints,
  trail_run: Mountain,
  walk: Footprints,
  hike: Mountain,
  ride: Bike,
  mtb: Bike,
  gravel: Bike,
  swim: Waves,
  workout: Dumbbell,
  other: MoreHorizontal,
};

/** Lista horizontal de esportes. */
export function SportPicker({ value, onChange }: { value: SportId; onChange: (s: SportId) => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.sports}
      accessibilityRole="radiogroup"
      accessibilityLabel={t("rec.pre.sport")}
    >
      {SPORT_IDS.map((id) => {
        const Icon = SPORT_ICONS[id];
        const selected = id === value;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={t(`rec.sports.${id}`)}
            onPress={() => {
              tap();
              onChange(id);
            }}
            style={[
              styles.sport,
              { backgroundColor: selected ? colors.brand : colors.surface, borderColor: selected ? colors.brand : colors.line },
            ]}
          >
            <Icon size={22} color={selected ? colors.onBrand : colors.fg} />
            <Text variant="caption" style={{ color: selected ? colors.onBrand : colors.fg }} numberOfLines={1}>
              {t(`rec.sports.${id}`)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Linha com interruptor (configurações rápidas da gravação). */
export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.toggle}>
      <Text variant="bodyStrong" style={styles.flex}>
        {label}
      </Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.line, true: colors.brand }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.line}
        // No navegador o react-native-web usa outra prop para a bolinha ligada.
        {...(Platform.OS === "web" ? ({ activeThumbColor: "#FFFFFF" } as object) : {})}
      />
    </View>
  );
}

/** Uma métrica: rótulo pequeno + número grande + unidade. */
export function Metric({ label, value, unit, big = false }: { label: string; value: string; unit?: string; big?: boolean }) {
  return (
    <View style={styles.metric} accessible accessibilityLabel={`${label}: ${value} ${unit ?? ""}`}>
      <Text variant="overline" color="muted">
        {label}
      </Text>
      <Text style={[styles.metricValue, big && styles.metricBig]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
        {unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

/** Pílula de status: Gravando / Pausado / Pausa automática. */
export function StatusPill({ status, autoPaused }: { status: "recording" | "paused" | "finished"; autoPaused: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const recording = status === "recording";
  const fg = recording ? colors.ok : colors.brandText;
  return (
    <View style={[styles.pill, { backgroundColor: recording ? "rgba(76,195,138,0.16)" : colors.brandSoft }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text variant="label" style={{ color: fg }}>
        {recording ? t("rec.live.recording") : autoPaused ? t("rec.live.autoPaused") : t("rec.live.paused")}
      </Text>
    </View>
  );
}

/**
 * Lista de parciais com barra proporcional à velocidade: barra mais longa e mais escura = mais rápida.
 */
export function SplitsList({ splits, units, metric }: { splits: readonly Split[]; units: Units; metric: "pace" | "speed" }) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  if (!splits.length) {
    return (
      <Text variant="body" color="muted" align="center" style={styles.noSplits}>
        {t("rec.live.noSplits", { unit: units === "imperial" ? "1 mi" : "1 km" })}
      </Text>
    );
  }
  const speeds = splits.map((s) => (s.movingMs > 0 ? s.distanceM / (s.movingMs / 1000) : 0));
  const max = Math.max(...speeds, 0.1);
  const min = Math.min(...speeds.filter((v) => v > 0), max);
  return (
    <View style={styles.splits} accessibilityRole="list">
      {splits.map((s, i) => {
        const speed = speeds[i]!;
        const ratio = Math.max(0.15, speed / max);
        const strength = max > min ? (speed - min) / (max - min) : 1;
        const value = metric === "pace" ? formatPace(speed, units) : formatSpeed(speed, units, i18n.language);
        const label = s.distanceM < 0.98 * (units === "imperial" ? 1609.344 : 1000) ? formatDistance(s.distanceM, units, i18n.language) : String(s.index);
        return (
          <View key={s.index} style={styles.splitRow} accessible accessibilityLabel={`${t("rec.live.split")} ${label}: ${value}`}>
            <Text variant="label" style={styles.splitIndex}>
              {label}
            </Text>
            <View style={styles.splitBarTrack}>
              <View
                style={[
                  styles.splitBar,
                  { width: `${ratio * 100}%`, backgroundColor: colors.brand, opacity: 0.45 + 0.55 * strength },
                ]}
              />
            </View>
            <Text variant="bodyStrong" style={styles.splitValue}>
              {value}
            </Text>
            <Text variant="caption" color="muted" style={styles.splitTime}>
              {formatDuration(s.movingMs)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Botão redondo das ações da gravação. */
export function RoundButton({
  label,
  icon,
  onPress,
  variant = "secondary",
  size = 72,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  variant?: "primary" | "secondary";
  size?: number;
}) {
  return (
    <View style={styles.roundWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          tap();
          onPress();
        }}
        style={({ pressed }) => [
          styles.round,
          { width: size, height: size, borderRadius: size / 2, transform: [{ scale: pressed ? 0.94 : 1 }] },
          variant === "secondary" && styles.roundSecondary,
        ]}
      >
        {variant === "primary" ? (
          <LinearGradient colors={["#F7C870", chrome.goldDeep]} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} />
        ) : null}
        <View style={styles.above}>{icon}</View>
      </Pressable>
      <Text variant="label" style={styles.roundLabel}>
        {label}
      </Text>
    </View>
  );
}

/** Segurar 1 s para confirmar (finalizar). O anel enche enquanto segura. */
export function HoldButton({ label, hint, icon, onConfirm, size = 72 }: { label: string; hint: string; icon: React.ReactNode; onConfirm: () => void; size?: number }) {
  const [progress] = useState(() => new Animated.Value(0));
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  const startHold = () => {
    tap();
    anim.current = Animated.timing(progress, { toValue: 1, duration: 1000, useNativeDriver: false });
    anim.current.start(({ finished }) => {
      if (finished) {
        progress.setValue(0);
        onConfirm();
      }
    });
  };
  const cancel = () => {
    anim.current?.stop();
    Animated.timing(progress, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };

  return (
    <View style={styles.roundWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={hint}
        // Leitores de tela não conseguem "segurar": a ação de acessibilidade confirma direto.
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={onConfirm}
        onPressIn={startHold}
        onPressOut={cancel}
        style={[styles.round, styles.finish, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.finishFill,
            { borderRadius: size / 2, transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.01, 1] }) }] },
          ]}
        />
        <View style={styles.above}>{icon}</View>
      </Pressable>
      <Text variant="label" style={styles.roundLabel}>
        {hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sports: { gap: 8, paddingVertical: 2 },
  sport: {
    width: 84,
    minHeight: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 6,
  },
  toggle: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48 },
  metric: { flex: 1, minWidth: "45%", gap: 2 },
  metricValue: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, fontVariant: ["tabular-nums"] },
  metricBig: { fontSize: 64, lineHeight: 72 },
  metricUnit: { fontFamily: fonts.semibold, fontSize: 15 },
  pill: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  noSplits: { paddingVertical: 24 },
  splits: { gap: 10 },
  splitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  splitIndex: { width: 40, fontVariant: ["tabular-nums"] },
  splitBarTrack: { flex: 1, height: 10 },
  splitBar: { height: 10, borderRadius: radius.full },
  splitValue: { width: 56, textAlign: "right", fontVariant: ["tabular-nums"] },
  splitTime: { width: 52, textAlign: "right", fontVariant: ["tabular-nums"] },
  roundWrap: { alignItems: "center", gap: 6 },
  round: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  roundSecondary: { backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: chrome.border },
  roundLabel: { color: chrome.white },
  above: { position: "relative", zIndex: 1 },
  finish: { backgroundColor: "rgba(229,72,77,0.25)", borderWidth: 2, borderColor: "#E5484D" },
  finishFill: { backgroundColor: "#E5484D" },
});

export { SPORTS };
