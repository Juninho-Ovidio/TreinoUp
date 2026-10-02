import { forwardRef, useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, View, type PressableProps, type ViewProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LucideIcon } from "lucide-react-native";
import { chrome, fonts, motion, radius, Text, useTheme } from "@/design-system";
import { tap } from "@/lib/haptics";

/** Altura do dock + margem: as telas com abas reservam este espaço embaixo. */
export const DOCK_HEIGHT = 64;
export const DOCK_GAP = 12;

/**
 * Dock flutuante em grafite, igual ao do TreinoUp web: vidro escuro, brilhos dourados
 * nas pontas, fio dourado no topo e o botão do meio (Gravar) em destaque.
 * Recebe os TabTriggers como filhos (via <TabList asChild>).
 */
export const Dock = forwardRef<View, ViewProps>(function Dock({ children, style, ...rest }, ref) {
  const { scheme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={[styles.outer, { paddingBottom: Math.max(insets.bottom, DOCK_GAP) }]}
    >
      <View
        ref={ref}
        {...rest}
        style={[
          style,
          styles.dock,
          { backgroundColor: scheme === "dark" ? chrome.glassDark : chrome.glass, borderColor: chrome.border },
        ]}
        accessibilityRole="tablist"
      >
        <LinearGradient
          pointerEvents="none"
          colors={[chrome.goldGlow, "transparent", "transparent", chrome.goldGlow]}
          locations={[0, 0.35, 0.65, 1]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          pointerEvents="none"
          colors={["transparent", "rgba(255,210,122,0.5)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.goldLine}
        />
        {children}
      </View>
    </View>
  );
});

type TriggerChildProps = PressableProps & { isFocused?: boolean; href?: string };

/** Botão comum do dock. `isFocused`, `onPress` e `href` chegam do TabTrigger. */
export const DockButton = forwardRef<View, TriggerChildProps & { icon: LucideIcon; label: string }>(function DockButton(
  { icon: Icon, label, isFocused = false, onPress, style: _style, href: _href, ...rest },
  ref,
) {
  const [focus] = useState(() => new Animated.Value(isFocused ? 1 : 0));
  useEffect(() => {
    Animated.timing(focus, { toValue: isFocused ? 1 : 0, duration: motion.slow, useNativeDriver: true }).start();
  }, [focus, isFocused]);

  return (
    <Pressable
      ref={ref}
      {...rest}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      onPress={(e) => {
        tap();
        onPress?.(e);
      }}
      style={({ pressed }) => [styles.slot, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
    >
      <Animated.View style={[styles.pill, { opacity: focus }]} />
      <Icon size={22} strokeWidth={isFocused ? 2.4 : 1.9} color={isFocused ? chrome.gold : chrome.idle} />
      <Text
        style={[styles.label, { color: isFocused ? chrome.goldLight : chrome.idle }]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
      >
        {label}
      </Text>
    </Pressable>
  );
});

/** Botão central dourado (Gravar). */
export const DockRecordButton = forwardRef<View, TriggerChildProps & { icon: LucideIcon; label: string }>(
  function DockRecordButton({ icon: Icon, label, isFocused = false, onPress, style: _style, href: _href, ...rest }, ref) {
    return (
      <View style={styles.slot}>
        <Pressable
          ref={ref}
          {...rest}
          accessibilityRole="tab"
          accessibilityState={{ selected: isFocused }}
          accessibilityLabel={label}
          onPress={(e) => {
            tap();
            onPress?.(e);
          }}
          style={({ pressed }) => [styles.record, { transform: [{ scale: pressed ? 0.9 : 1 }] }]}
        >
          <LinearGradient colors={["#F7C870", chrome.goldDeep]} style={[StyleSheet.absoluteFill, styles.recordFill]} />
          <View style={styles.recordIcon}>
            <Icon size={26} strokeWidth={2.6} color={chrome.graphite} />
          </View>
        </Pressable>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  outer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 12, alignItems: "center" },
  dock: {
    width: "100%",
    maxWidth: 480,
    height: DOCK_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.dock,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  goldLine: { position: "absolute", top: 0, left: 40, right: 40, height: 1 },
  slot: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center", gap: 4 },
  pill: {
    position: "absolute",
    top: 6,
    bottom: 6,
    left: 4,
    right: 4,
    borderRadius: 20,
    backgroundColor: chrome.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.06)",
  },
  label: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.3 },
  record: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  recordFill: { borderRadius: 18 },
  // Acima do degradê (na web, elementos posicionados são pintados por cima dos demais).
  recordIcon: { position: "relative", zIndex: 1 },
});
