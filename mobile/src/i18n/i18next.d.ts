import "i18next";
import type ptBR from "./locales/pt-BR";

// Chaves de tradução tipadas: t("auth.login.title") é checado pelo TypeScript.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof ptBR };
  }
}
