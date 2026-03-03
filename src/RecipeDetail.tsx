import { useEffect, useState } from "react";
import { getRecipeByUuid } from "./db";
import type { Recipe } from "./types";

function formatDuration(minutes: number): string {
  if (minutes === 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} mins`;
  if (m === 0) return h === 1 ? "1 hour" : `${h} hours`;
  return `${h} hour${h > 1 ? "s" : ""} ${m} mins`;
}

interface RecipeDetailProps {
  id: string;
  onBack: () => void;
}

export function RecipeDetail({ id, onBack }: RecipeDetailProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    getRecipeByUuid(id).then(setRecipe);
  }, [id]);

  if (!recipe) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button
            onClick={onBack}
            className="text-sm text-stone-500 hover:text-amber-700 transition-colors cursor-pointer"
          >
            &larr; Back to recipes
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-6">
          {recipe.name}
        </h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-stone-400">Prep</dt>
            <dd className="mt-1 font-medium">{formatDuration(recipe.prepTimeMinutes)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-stone-400">Cook</dt>
            <dd className="mt-1 font-medium">{formatDuration(recipe.cookTimeMinutes)}</dd>
          </div>
          {recipe.additionalTimeMinutes > 0 && (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-widest text-stone-400">Additional</dt>
              <dd className="mt-1 font-medium">{formatDuration(recipe.additionalTimeMinutes)}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-semibold uppercase tracking-widest text-stone-400">Total</dt>
            <dd className="mt-1 font-medium">
              {formatDuration(recipe.prepTimeMinutes + recipe.cookTimeMinutes + recipe.additionalTimeMinutes)}
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-widest text-stone-400">Servings</dt>
              <dd className="mt-1 font-medium">{recipe.servings}</dd>
            </div>
            {recipe.yield && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-widest text-stone-400">Yield</dt>
                <dd className="mt-1 font-medium">{recipe.yield}</dd>
              </div>
            )}
          </div>
        </div>

        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
            Ingredients
          </h2>
          <table className="text-sm">
            <tbody>
              {recipe.ingredients.map((ing, i) => (
                <tr key={i}>
                  <td className="py-1.5 pr-8 text-stone-400 w-0 whitespace-nowrap">
                    {ing.amount} {ing.unit}
                  </td>
                  <td className="pr-5 py-1.5 font-medium">
                    {ing.name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
            Steps
          </h2>
          <ol className="space-y-4">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="flex-none w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed pt-[2px]">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
