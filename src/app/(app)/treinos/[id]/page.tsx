import { WorkoutEditor } from "../WorkoutEditor";

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkoutEditor id={id} />;
}
