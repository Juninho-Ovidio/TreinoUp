import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native";
import { useTheme } from "../theme";
import { typography, type Palette, type TypographyVariant } from "../tokens";

type ColorToken = keyof Omit<Palette, "hrZones">;

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: TextStyle["textAlign"];
}

export function Text({ variant = "body", color = "fg", align, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      style={[typography[variant] as TextStyle, { color: colors[color] }, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}
