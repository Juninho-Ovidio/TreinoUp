import { Apple, Coffee, Moon, Sunrise, Utensils } from "lucide-react";

const ICONS = { sunrise: Sunrise, utensils: Utensils, apple: Apple, moon: Moon, cup: Coffee } as const;

export function MealIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? Utensils;
  return <Icon className={className} aria-hidden />;
}
