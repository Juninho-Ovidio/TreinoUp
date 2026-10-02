import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme";
import { chrome, fonts, radius, touchTarget } from "../tokens";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "md" | "lg";

export interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Botão em pílula do TreinoUp. O principal usa o degradê dourado do botão central do dock. */
export function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  block = false,
  icon,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { colors, scheme } = useTheme();
  const inactive = disabled || loading;

  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.brand, fg: colors.onBrand },
    secondary: { bg: colors.surface, fg: colors.fg, border: colors.line },
    ghost: { bg: "transparent", fg: colors.fg },
    danger: { bg: colors.danger, fg: scheme === "dark" ? chrome.graphite : chrome.white },
    soft: { bg: colors.brandSoft, fg: colors.brandText },
  };
  const p = palette[variant];
  const height = size === "lg" ? 54 : touchTarget;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      accessibilityLabel={label}
      disabled={inactive}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          backgroundColor: p.bg,
          borderColor: p.border ?? "transparent",
          borderWidth: p.border ? StyleSheet.hairlineWidth * 2 : 0,
          opacity: inactive ? 0.55 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        block && styles.block,
        style,
      ]}
      {...rest}
    >
      {variant === "primary" && scheme === "light" ? (
        <LinearGradient colors={["#F7C870", chrome.goldDeep]} style={[StyleSheet.absoluteFill, styles.gradient]} />
      ) : null}
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={p.fg} size="small" /> : icon}
        <Text
          variant="bodyStrong"
          style={{ color: p.fg, fontFamily: fonts.bold, fontSize: size === "lg" ? 16 : 15 }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  block: { alignSelf: "stretch" },
  gradient: { borderRadius: radius.full },
  content: { flexDirection: "row", alignItems: "center", gap: 8 },
});
