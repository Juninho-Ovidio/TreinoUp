import { Suspense } from "react";
import { FoodSearch } from "./FoodSearch";

export default function SearchPage() {
  return (
    <Suspense>
      <FoodSearch />
    </Suspense>
  );
}
