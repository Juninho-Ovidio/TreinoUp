import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme";
import { radius } from "../tokens";

/** Bloco pulsante para estados de carregamento. Respeita "reduzir movimento". */
export function Skeleton({
  width = "100%",
  height = 16,
  rounded = radius.sm,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.6));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (reduce || cancelled) return;
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.6, duration: 700, useNativeDriver: true }),
          ]),
        );
        loop.start();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: rounded, backgroundColor: colors.surface2, opacity }, style]}
    />
  );
}
