import { useState } from "react";
import { RecipeList } from "./RecipeList";
import { RecipeDetail } from "./RecipeDetail";
import type { Recipe } from "./types";

const sampleRecipes: Recipe[] = [
  {
    id: "1",
    title: "Pancakes",
    ingredients: [
      { name: "flour", amount: 1.5, unit: "cups" },
      { name: "milk", amount: 1.25, unit: "cups" },
      { name: "egg", amount: 1, unit: "" },
      { name: "butter", amount: 3, unit: "tbsp" },
    ],
    steps: [
      "Mix dry ingredients in a bowl.",
      "Whisk in milk, egg, and melted butter until smooth.",
      "Heat a skillet over medium heat and grease lightly.",
      "Pour batter and cook until bubbles form, then flip.",
    ],
  },
  {
    id: "2",
    title: "Tomato Soup",
    ingredients: [
      { name: "canned tomatoes", amount: 2, unit: "cans" },
      { name: "onion", amount: 1, unit: "" },
      { name: "garlic", amount: 3, unit: "cloves" },
      { name: "vegetable broth", amount: 2, unit: "cups" },
    ],
    steps: [
      "Saut\u00e9 diced onion and garlic until soft.",
      "Add tomatoes and broth, bring to a simmer.",
      "Cook for 20 minutes, then blend until smooth.",
      "Season with salt and pepper to taste.",
    ],
  },
];

function App() {
  const [selected, setSelected] = useState<Recipe | null>(null);

  if (selected) {
    return <RecipeDetail recipe={selected} onBack={() => setSelected(null)} />;
  }

  return <RecipeList recipes={sampleRecipes} onSelect={setSelected} />;
}

export default App;
