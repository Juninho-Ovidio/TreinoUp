import { Suspense } from "react";
import { FoodForm } from "./FoodForm";

export default function NewFoodPage() {
  return (
    <Suspense>
      <FoodForm />
    </Suspense>
  );
}
