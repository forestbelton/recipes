export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface Recipe {
  id: string;
  createdAt: string;
  name: string;
  source: string | null;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  additionalTimeMinutes: number;
  servings: string;
  yield: string | null;
  ingredients: Ingredient[];
  steps: string[];
}
