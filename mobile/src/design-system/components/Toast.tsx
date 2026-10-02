import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react-native";
import { useTheme } from "../theme";
import { motion, radius } from "../tokens";
import { Text } from "./Text";

type Kind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: Kind;
  text: string;
}
export interface ToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const insets = useSafeAreaInsets();

  const remove = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback(
    (kind: Kind, text: string) => {
      const id = ++seq.current;
      setItems((l) => [...l.slice(-2), { id, kind, text }]);
      setTimeout(() => remove(id), kind === "error" ? 5000 : 2800);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({ success: (t) => push("success", t), error: (t) => push("error", t), info: (t) => push("info", t) }),
    [push],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <View pointerEvents="box-none" style={[styles.stack, { top: insets.top + 8 }]}>
        {items.map((t) => (
          <ToastView key={t.id} item={t} onClose={() => remove(t.id)} />
        ))}
      </View>
    </Ctx.Provider>
  );
}

function ToastView({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const { colors } = useTheme();
  const [enter] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: motion.base, useNativeDriver: true }).start();
  }, [enter]);

  const Icon = item.kind === "success" ? CircleCheck : item.kind === "error" ? CircleAlert : Info;
  const iconColor = item.kind === "success" ? colors.ok : item.kind === "error" ? colors.danger : colors.muted;

  return (
    <Animated.View
      accessibilityLiveRegion={item.kind === "error" ? "assertive" : "polite"}
      role={item.kind === "error" ? "alert" : "status"}
      style={[
        styles.toast,
        { backgroundColor: colors.surface, borderColor: colors.line },
        { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] },
      ]}
    >
      <Icon size={20} color={iconColor} />
      <Text variant="bodyStrong" style={styles.text}>
        {item.text}
      </Text>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar aviso" hitSlop={12}>
        <X size={16} color={colors.muted} />
      </Pressable>
    </Animated.View>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return ctx;
}

const styles = StyleSheet.create({
  stack: { position: "absolute", left: 16, right: 16, alignItems: "center", gap: 8, zIndex: 100 },
  toast: {
    width: "100%",
    maxWidth: 420,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  text: { flex: 1, fontSize: 14 },
});
