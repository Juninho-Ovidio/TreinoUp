import { Platform } from "react-native";

/**
 * O app web pode ser publicado dentro do site TreinoUp (treinoup.vercel.app/app).
 * Nesse modo o login, o cadastro e a tela inicial são os do site; o app abre direto no Run.
 * Ligado no build do site (scripts/build-mobile-web.mjs) com EXPO_PUBLIC_WEB_EMBEDDED=true.
 */
export const webEmbedded = Platform.OS === "web" && process.env.EXPO_PUBLIC_WEB_EMBEDDED === "true";

const SITE_HOME = process.env.EXPO_PUBLIC_WEB_HOME || "/inicio";
const SITE_LOGIN = process.env.EXPO_PUBLIC_WEB_LOGIN || "/login";

/** Vai para uma página do site (navegação completa, fora do app). */
function goToSite(path: string) {
  window.location.assign(path);
}

export function goToSiteHome() {
  goToSite(SITE_HOME);
}

/** Login do site, voltando para onde a pessoa estava no app. */
export function goToSiteLogin() {
  const here = window.location.pathname + window.location.search;
  goToSite(`${SITE_LOGIN}?next=${encodeURIComponent(here)}`);
}
