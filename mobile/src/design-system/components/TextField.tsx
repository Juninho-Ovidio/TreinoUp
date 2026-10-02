import { forwardRef, useId, useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "../theme";
import { fonts, radius } from "../tokens";
import { Text } from "./Text";

export interface TextFieldProps extends TextInputProps {
  label: string;
  hint?: string | null;
  error?: string | null;
  /** Texto fixo à esquerda, como "@" no nome de usuário. */
  prefix?: string;
  /** Aviso positivo (ex.: "Disponível"), mostrado no lugar da dica. */
  success?: string | null;
}

/** Rótulo + campo + dica/erro, no padrão do TreinoUp (campo alto, cantos de 16). */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, hint, error, prefix, success, style, onFocus, onBlur, multiline, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const id = useId();
  const message = error ?? success ?? hint;
  const borderColor = error ? colors.danger : focused ? colors.brand : colors.line;

  return (
    <View style={styles.wrap}>
      <Text variant="label" color="muted" nativeID={`${id}-label`}>
        {label}
      </Text>
      <View style={[styles.box, multiline && styles.multiline, { borderColor, backgroundColor: colors.surface }]}>
        {prefix ? (
          <Text variant="body" color="muted" style={styles.prefix}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityLabelledBy={`${id}-label`}
          accessibilityHint={message ?? undefined}
          aria-invalid={!!error}
          placeholderTextColor={colors.faint}
          selectionColor={colors.brand}
          cursorColor={colors.brandText}
          multiline={multiline}
          maxFontSizeMultiplier={1.6}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.inputMultiline, { color: colors.fg }, style]}
          {...rest}
        />
      </View>
      {message ? (
        <Text
          variant="caption"
          color={error ? "danger" : success ? "ok" : "muted"}
          accessibilityLiveRegion={error ? "assertive" : "polite"}
          role={error ? "alert" : undefined}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  box: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  multiline: { alignItems: "flex-start", paddingVertical: 12 },
  prefix: { marginRight: 2 },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 16, paddingVertical: 12 },
  inputMultiline: { minHeight: 88, paddingVertical: 0, textAlignVertical: "top" },
});
