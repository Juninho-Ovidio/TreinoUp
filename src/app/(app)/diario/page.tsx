import { Suspense } from "react";
import { DiaryView } from "./DiaryView";

export default function DiaryPage() {
  return (
    <Suspense>
      <DiaryView />
    </Suspense>
  );
}
