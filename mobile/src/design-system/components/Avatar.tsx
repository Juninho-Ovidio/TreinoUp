import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "../theme";
import { fonts } from "../tokens";
import { Text } from "./Text";

/** Até duas iniciais do nome ("Ana Clara Souza" → "AS"). */
export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0]!.charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : "";
  return (first + last).toUpperCase();
}

export function Avatar({
  uri,
  name,
  size = 48,
  ring = false,
  accessibilityLabel,
}: {
  uri?: string | null;
  name?: string | null;
  size?: number;
  /** Anel dourado (perfil em destaque, conquista). */
  ring?: boolean;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  const box = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? name ?? undefined}
      style={[box, styles.wrap, { backgroundColor: colors.brandSoft }, ring && { borderWidth: 2, borderColor: colors.brand }]}
    >
      {uri ? (
        <Image source={{ uri }} style={box} contentFit="cover" transition={150} />
      ) : (
        <Text style={{ fontFamily: fonts.display, fontSize: size * 0.38, color: colors.brandText }}>{initials(name)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
