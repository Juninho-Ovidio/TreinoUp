import { Suspense } from "react";
import { Scanner } from "./Scanner";

export default function ScannerPage() {
  return (
    <Suspense>
      <Scanner />
    </Suspense>
  );
}
