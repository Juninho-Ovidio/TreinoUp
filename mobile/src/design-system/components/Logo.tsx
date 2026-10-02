import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { useTheme } from "../theme";
import { chrome, fonts } from "../tokens";
import { useSvgId } from "../useSvgId";
import { Text } from "./Text";

/** Fundo grafite + degradê dourado, comum aos dois símbolos. */
function MarkFrame({ size, children }: { size: number; children: (gold: string) => React.ReactNode }) {
  const bg = useSvgId("mark-bg");
  const gold = useSvgId("mark-gd");
  return (
    // Decorativo: quem usa o símbolo dá o rótulo acessível (Logo, botões do cabeçalho).
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <LinearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#22222B" />
          <Stop offset="1" stopColor="#0D0D11" />
        </LinearGradient>
        <LinearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE29A" />
          <Stop offset="1" stopColor="#E8A33D" />
        </LinearGradient>
      </Defs>
      <Rect width="120" height="120" rx="27" fill={`url(#${bg})`} />
      {children(`url(#${gold})`)}
    </Svg>
  );
}

/** Símbolo do TreinoUp (o mesmo do site: public/icons/icon.svg). */
export function TreinoUpMark({ size = 40 }: { size?: number }) {
  return (
    <MarkFrame size={size}>
      {(gold) => (
        <>
          <Path
            d="M32 54V68C32 84 44 96 60 96C76 96 88 84 88 68V54"
            fill="none"
            stroke="#FFF1CC"
            strokeWidth={13}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M44 38L60 22L76 38M60 24V72"
            fill="none"
            stroke={gold}
            strokeWidth={13}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </MarkFrame>
  );
}

/** Símbolo do TreinoUp Run: a seta dourada do TreinoUp saindo de uma trilha (assets/brand/run-mark.svg). */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <MarkFrame size={size}>
      {(gold) => (
        <>
          <Path
            d="M30 92C46 92 44 70 60 70C74 70 76 56 76 44"
            fill="none"
            stroke="#FFF1CC"
            strokeWidth={12}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="30" cy="92" r="9" fill={gold} />
          <Path
            d="M60 42L76 26L92 42M76 28V52"
            fill="none"
            stroke={gold}
            strokeWidth={12}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </MarkFrame>
  );
}

/**
 * Logo horizontal: símbolo + "TreinoUp" + linha de apoio.
 * `variant="treinoup"`: "TREINO E DIETA" (como no site); `variant="run"`: "RUN".
 * `size` é a altura do símbolo; `onDark` força texto claro.
 */
export function Logo({
  size = 48,
  onDark = false,
  variant = "treinoup",
}: {
  size?: number;
  onDark?: boolean;
  variant?: "treinoup" | "run";
}) {
  const { colors, scheme } = useTheme();
  const dark = onDark || scheme === "dark";
  const run = variant === "run";
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={run ? "TreinoUp Run" : "TreinoUp"}
      style={{ flexDirection: "row", alignItems: "center", gap: size * 0.26 }}
    >
      {run ? <LogoMark size={size} /> : <TreinoUpMark size={size} />}
      <View>
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: size * 0.62,
            lineHeight: size * 0.7,
            letterSpacing: -0.03 * size * 0.62,
            color: dark ? chrome.white : colors.fg,
          }}
        >
          Treino
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: size * 0.62,
              lineHeight: size * 0.7,
              color: dark ? chrome.gold : "#A8650A",
            }}
          >
            Up
          </Text>
        </Text>
        <Text
          style={{
            fontFamily: fonts.displaySemibold,
            fontSize: size * (run ? 0.2 : 0.17),
            letterSpacing: size * (run ? 0.04 : 0.022),
            marginTop: size * 0.08,
            color: dark ? chrome.goldLight : colors.brandText,
          }}
        >
          {run ? "RUN" : "TREINO E DIETA"}
        </Text>
      </View>
    </View>
  );
}
