import { Suspense } from "react";
import { AssessmentForm } from "./AssessmentForm";

export default function NewAssessmentPage() {
  return (
    <Suspense>
      <AssessmentForm />
    </Suspense>
  );
}
