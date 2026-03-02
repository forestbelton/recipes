import { useEffect, useState } from "react";
import { RecipeList } from "./RecipeList";
import { RecipeDetail } from "./RecipeDetail";
import { allRecipes } from "./db";
import type { Recipe } from "./types";

function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    allRecipes().then((r) => {
      setRecipes(r);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400">
        Loading...
      </div>
    );
  }

  if (selectedId) {
    return <RecipeDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return <RecipeList recipes={recipes} onSelect={setSelectedId} />;
}

export default App;
