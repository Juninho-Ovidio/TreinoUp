import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme";
import { radius } from "../tokens";

export function clampProgress(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(1, Math.max(0, value / max));
}

export function ProgressBar({
  value,
  max = 1,
  height = 8,
  color,
  accessibilityLabel,
}: {
  value: number;
  max?: number;
  height?: number;
  color?: string;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const ratio = clampProgress(value, max);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
      style={[styles.track, { height, backgroundColor: colors.ringTrack }]}
    >
      <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color ?? colors.brand }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: "100%", borderRadius: radius.full, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radius.full },
});
