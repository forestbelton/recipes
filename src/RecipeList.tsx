import { useState } from "react";
import type { Recipe } from "./types";

interface RecipeListProps {
  recipes: Recipe[];
  onSelect: (recipe: Recipe) => void;
}

export function RecipeList({ recipes, onSelect }: RecipeListProps) {
  const [search, setSearch] = useState("");

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold tracking-tight mb-4">Recipes</h1>
          <input
            type="text"
            placeholder="Search recipes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-stone-50 px-4 py-2.5 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
          />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <p className="text-center text-stone-400 py-12">No recipes found.</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((recipe) => (
              <li key={recipe.id}>
                <button
                  onClick={() => onSelect(recipe)}
                  className="w-full text-left bg-white rounded-xl border border-stone-200 px-5 py-4 hover:border-amber-400 hover:shadow-sm transition group"
                >
                  <span className="text-lg font-semibold group-hover:text-amber-700 transition-colors">
                    {recipe.title}
                  </span>
                  <span className="block text-sm text-stone-400 mt-1">
                    {recipe.ingredients.length} ingredients &middot;{" "}
                    {recipe.steps.length} steps
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
