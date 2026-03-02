import initSqlJs, { type Database } from "sql.js";
import type { Recipe } from "./types";

let dbPromise: Promise<Database> | null = null;

function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = initSqlJs({
      locateFile: (file) => `/${file}`,
    }).then(async (SQL) => {
      const response = await fetch("/recipes.db");
      const buffer = await response.arrayBuffer();
      return new SQL.Database(new Uint8Array(buffer));
    });
  }
  return dbPromise;
}

function buildRecipes(db: Database, whereClause: string, params: Record<string, string> = {}): Recipe[] {
  const rows = db.exec(
    `SELECT r.id, r.created_at, r.name, r.source,
            ri.name AS ing_name, ri.amount, ri.unit,
            rs.step_number, rs.step_content
     FROM recipe r
     LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
     LEFT JOIN recipe_steps rs ON rs.recipe_id = r.id
     ${whereClause}
     ORDER BY r.name, rs.step_number`,
    params,
  );

  if (rows.length === 0) return [];

  const result = rows[0];
  const cols = result.columns;
  const idx = Object.fromEntries(cols.map((c, i) => [c, i]));

  const recipesMap = new Map<string, Recipe>();

  for (const row of result.values) {
    const id = row[idx["id"]] as string;

    if (!recipesMap.has(id)) {
      recipesMap.set(id, {
        id,
        createdAt: row[idx["created_at"]] as string,
        name: row[idx["name"]] as string,
        source: row[idx["source"]] as string | null,
        ingredients: [],
        steps: [],
      });
    }

    const recipe = recipesMap.get(id)!;

    const ingName = row[idx["ing_name"]];
    if (ingName != null && !recipe.ingredients.some((i) => i.name === ingName)) {
      recipe.ingredients.push({
        name: ingName as string,
        amount: row[idx["amount"]] as number,
        unit: row[idx["unit"]] as string,
      });
    }

    const stepContent = row[idx["step_content"]];
    if (stepContent != null && !recipe.steps.includes(stepContent as string)) {
      recipe.steps.push(stepContent as string);
    }
  }

  return [...recipesMap.values()];
}

export async function allRecipes(): Promise<Recipe[]> {
  const db = await getDb();
  return buildRecipes(db, "");
}

export async function getRecipeByUuid(id: string): Promise<Recipe | null> {
  const db = await getDb();
  const results = buildRecipes(db, "WHERE r.id = $id", { $id: id });
  return results[0] ?? null;
}
