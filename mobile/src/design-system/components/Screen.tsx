import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewProps } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { space } from "../tokens";
import { AppBackground } from "./AppBackground";

/**
 * Tela padrão: fundo do app, área segura, rolagem e teclado sem cobrir os campos.
 * `bottomInset` reserva espaço para o dock nas telas com abas.
 */
export function Screen({
  children,
  header,
  scroll = true,
  edges = ["top", "left", "right"],
  bottomInset = 0,
  contentStyle,
  ...rest
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  bottomInset?: number;
  contentStyle?: ScrollViewProps["contentContainerStyle"];
} & Omit<ScrollViewProps, "contentContainerStyle">) {
  return (
    <View style={styles.root}>
      <AppBackground />
      <SafeAreaView edges={edges} style={styles.root}>
        {header ? <View style={styles.header}>{header}</View> : null}
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {scroll ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.content, { paddingBottom: space.xxxl + bottomInset }, contentStyle]}
              {...rest}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.root, styles.content, { paddingBottom: space.xxl + bottomInset }, contentStyle]}>
              {children}
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.sm },
  content: { flexGrow: 1, paddingHorizontal: space.xl, paddingTop: space.lg, gap: space.lg },
});
