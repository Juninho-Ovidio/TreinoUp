import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";
import { useTheme } from "../theme";
import { useSvgId } from "../useSvgId";

/**
 * Fundo do app no estilo do TreinoUp web (.app-bg): base clara/grafite com dois brilhos
 * dourados nos cantos. Fica atrás de tudo e não recebe toques.
 */
export function AppBackground() {
  const { scheme, colors } = useTheme();
  const dark = scheme === "dark";
  const base = useSvgId("bg-base");
  const glowTop = useSvgId("bg-glow-top");
  const glowBottom = useSvgId("bg-glow-bottom");
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={base} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={dark ? "#1D1D26" : "#FCF8F0"} />
            <Stop offset="0.45" stopColor={colors.bg} />
            <Stop offset="1" stopColor={dark ? "#0C0C10" : colors.bg} />
          </LinearGradient>
          <RadialGradient id={glowTop} cx="92%" cy="-6%" rx="60%" ry="38%" fx="92%" fy="-6%">
            <Stop offset="0" stopColor="#E8A33D" stopOpacity={dark ? 0.2 : 0.22} />
            <Stop offset="1" stopColor="#E8A33D" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={glowBottom} cx="-12%" cy="104%" rx="55%" ry="34%" fx="-12%" fy="104%">
            <Stop offset="0" stopColor={dark ? "#FFD27A" : "#E8A33D"} stopOpacity={dark ? 0.09 : 0.13} />
            <Stop offset="1" stopColor="#E8A33D" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${base})`} />
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${glowTop})`} />
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${glowBottom})`} />
      </Svg>
    </View>
  );
}
