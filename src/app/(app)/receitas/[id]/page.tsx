import { RecipeEditor } from "../RecipeEditor";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecipeEditor id={id} />;
}
