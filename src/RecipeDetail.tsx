import type { Recipe } from "./types";

interface RecipeDetailProps {
  recipe: Recipe;
  onBack: () => void;
}

export function RecipeDetail({ recipe, onBack }: RecipeDetailProps) {
  return (
    <div>
      <button onClick={onBack}>&larr; Back to recipes</button>
      <h1>{recipe.title}</h1>

      <h2>Ingredients</h2>
      <ul>
        {recipe.ingredients.map((ing, i) => (
          <li key={i}>
            {ing.amount} {ing.unit} {ing.name}
          </li>
        ))}
      </ul>

      <h2>Steps</h2>
      <ol>
        {recipe.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
