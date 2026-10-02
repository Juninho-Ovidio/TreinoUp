import { redirect } from "next/navigation";

/** "Medidas corporais" virou "Avaliação". */
export default function MeasurementsPage() {
  redirect("/progresso/avaliacao");
}
