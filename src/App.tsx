import { useEffect, useState } from "react";
import { RecipeList } from "./RecipeList";
import { RecipeDetail } from "./RecipeDetail";
import { allRecipes } from "./db";
import type { Recipe } from "./types";

const BASE = import.meta.env.BASE_URL;

function parsePath(): string | null {
  const match = location.pathname.match(new RegExp(`^${BASE}recipe/(.+?)/?$`));
  return match ? match[1] : null;
}

function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(parsePath);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect legacy hash URLs to path-based URLs
    const hashMatch = location.hash.match(/^#\/recipe\/(.+)$/);
    if (hashMatch) {
      history.replaceState(null, "", `${BASE}recipe/${hashMatch[1]}`);
      setSelectedId(hashMatch[1]);
    }
  }, []);

  useEffect(() => {
    allRecipes().then((r) => {
      setRecipes(r);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const onPopState = () => setSelectedId(parsePath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function selectRecipe(id: string | null) {
    if (id) {
      history.pushState(null, "", `${BASE}recipe/${id}`);
    } else {
      history.pushState(null, "", BASE);
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
