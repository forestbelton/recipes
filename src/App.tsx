import { useEffect, useState } from "react";
import { RecipeList } from "./RecipeList";
import { RecipeDetail } from "./RecipeDetail";
import { allRecipes } from "./db";
import type { Recipe } from "./types";

function parseHash(): string | null {
  const match = location.hash.match(/^#\/recipe\/(.+)$/);
  return match ? match[1] : null;
}

function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(parseHash);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    allRecipes().then((r) => {
      setRecipes(r);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const onHashChange = () => setSelectedId(parseHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function selectRecipe(id: string | null) {
    if (id) {
      location.hash = `#/recipe/${id}`;
    } else {
      history.pushState(null, "", location.pathname + location.search);
    }
    setSelectedId(id);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400">
        Loading...
      </div>
    );
  }

  if (selectedId) {
    return <RecipeDetail id={selectedId} onBack={() => selectRecipe(null)} />;
  }

  return <RecipeList recipes={recipes} onSelect={selectRecipe} />;
}

export default App;
