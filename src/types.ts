export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: Ingredient[];
  steps: string[];
}
