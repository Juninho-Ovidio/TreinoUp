import "server-only";
import { openFoodFacts } from "./openfoodfacts";
import type { FoodProvider } from "./provider";

/** Bases externas ativas, em ordem de preferência. */
export const providers: FoodProvider[] = [openFoodFacts];
