import { useEffect, useState } from "react";
import { getRecipeByUuid } from "./db";
import type { Recipe } from "./types";

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
        <h1 className="text-3xl font-bold tracking-tight mb-8">
          {recipe.name}
        </h1>

        <section className="mb-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
            Ingredients
          </h2>
          <ul className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
            {recipe.ingredients.map((ing, i) => (
              <li
                key={i}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <span className="font-medium">{ing.name}</span>
                <span className="text-stone-400">
                  {ing.amount} {ing.unit}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
            Steps
          </h2>
          <ol className="space-y-4">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex-none w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed pt-1">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
