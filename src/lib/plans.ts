import type { Plan } from "./types";

/**
 * Recursos por plano. A cobrança ainda não existe: o plano fica em profiles.plan e só pode ser
 * alterado pelo servidor (service_role). Quando o pagamento for integrado (Stripe, RevenueCat…),
 * um webhook atualiza esse campo.
 */
export type Feature =
  | "advanced_reports"
  | "assistant"
  | "unlimited_recipes"
  | "advanced_analytics"
  | "custom_goals"
  | "full_history"
  | "export";

const PREMIUM_FEATURES: Feature[] = [
  "advanced_reports",
  "assistant",
  "unlimited_recipes",
  "advanced_analytics",
  "custom_goals",
  "full_history",
  "export",
];

export const FREE_RECIPE_LIMIT = 5;
/** Histórico visível nos gráficos do plano gratuito, em dias. */
export const FREE_HISTORY_DAYS = 30;

export function effectivePlan(plan: Plan | null | undefined): Plan {
  if (process.env.NEXT_PUBLIC_ALL_PREMIUM === "true") return "premium";
  return plan ?? "free";
}

export function can(plan: Plan | null | undefined, feature: Feature): boolean {
  if (effectivePlan(plan) === "premium") return true;
  return !PREMIUM_FEATURES.includes(feature);
}

export const PLAN_FEATURES = {
  free: ["Diário alimentar", "Peso e medidas", "Controle de água", "Macros básicos", "Busca de alimentos e código de barras", "Gráficos de 7 e 30 dias", `Até ${FREE_RECIPE_LIMIT} receitas`],
  premium: ["Assistente Nutri", "Receitas ilimitadas", "Gráficos de 90 dias e 1 ano", "Histórico completo", "Exportação dos dados"],
};
