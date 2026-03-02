export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface Recipe {
  id: string;
  createdAt: string;
  name: string;
  source: string | null;
  ingredients: Ingredient[];
  steps: string[];
}
