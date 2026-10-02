import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme";
import { chrome, radius } from "../tokens";
import { Text } from "./Text";

/**
 * Cabeçalho em pílula grafite, igual ao do TreinoUp web: vidro escuro, borda sutil e
 * fio dourado no topo. O conteúdo é sempre claro (o fundo é escuro nos dois temas).
 */
export function HeaderBar({
  title,
  subtitle,
  left,
  right,
}: {
  title?: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const { scheme } = useTheme();
  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: scheme === "dark" ? chrome.glassDark : chrome.glass, borderColor: chrome.border },
      ]}
    >
      <LinearGradient
        colors={["transparent", "rgba(255,210,122,0.5)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.goldLine}
        pointerEvents="none"
      />
      {left}
      {title && subtitle ? (
        <View style={styles.titleBlock}>
          <Text variant="heading" style={styles.titleGold} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          <Text variant="caption" style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      ) : title ? (
        <Text variant="heading" style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      ) : (
        <View style={styles.spacer} />
      )}
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

/** Botão quadrado-arredondado para dentro do HeaderBar. */
export function HeaderButton({
  label,
  onPress,
  children,
  outlined = false,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  /** Contorno dourado (ações do Início, como no TreinoUp). */
  outlined?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.btn,
        outlined ? styles.btnOutlined : styles.btnFilled,
        { transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  goldLine: { position: "absolute", top: 0, left: 40, right: 40, height: 1 },
  title: { flex: 1, color: chrome.white },
  titleBlock: { flex: 1, gap: 2 },
  titleGold: { color: chrome.gold, fontSize: 17 },
  subtitle: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  spacer: { flex: 1 },
  right: { flexDirection: "row", gap: 8 },
  btn: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  btnFilled: { backgroundColor: "rgba(255,255,255,0.10)" },
  btnOutlined: { borderWidth: 1.5, borderColor: "rgba(255,210,122,0.7)" },
});
