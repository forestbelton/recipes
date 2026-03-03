import initSqlJs, { type Database } from "sql.js";
import type { Recipe } from "./types";

let dbPromise: Promise<Database> | null = null;

async function loadDb(): Promise<Database> {
  const [SQL, buffer] = await Promise.all([
    initSqlJs({ locateFile: (file) => `${import.meta.env.BASE_URL}${file}` }),
    fetch(`${import.meta.env.BASE_URL}recipes.db`).then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch recipes.db: ${res.status}`);
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("text/html")) {
        throw new Error(`recipes.db returned HTML — file may be missing from public/`);
      }
      return res.arrayBuffer();
    }),
  ]);
  return new SQL.Database(new Uint8Array(buffer));
}

function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = loadDb().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

interface RecipeRow {
  id: string;
  created_at: string;
  name: string;
  source: string | null;
  prep_time_minutes: number;
  cook_time_minutes: number;
  additional_time_minutes: number;
  servings: string;
  yield: string | null;
  ing_name: string | null;
  amount: string | null;
  unit: string | null;
  step_number: number | null;
  step_content: string | null;
}

function buildRecipes(db: Database, whereClause: string, params?: Record<string, string>): Recipe[] {
  const sql = `SELECT r.id, r.created_at, r.name, r.source,
            r.prep_time_minutes, r.cook_time_minutes, r.additional_time_minutes,
            r.servings, r.yield,
            ri.name AS ing_name, ri.amount, ri.unit,
            rs.step_number, rs.step_content
     FROM recipe r
     LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
     LEFT JOIN recipe_steps rs ON rs.recipe_id = r.id
     ${whereClause}
     ORDER BY r.name, rs.step_number`;

  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);

  const recipesMap = new Map<string, Recipe>();

  while (stmt.step()) {
    const row = stmt.getAsObject() as unknown as RecipeRow;

    if (!recipesMap.has(row.id)) {
      recipesMap.set(row.id, {
        id: row.id,
        createdAt: row.created_at,
        name: row.name,
        source: row.source,
        prepTimeMinutes: row.prep_time_minutes,
        cookTimeMinutes: row.cook_time_minutes,
        additionalTimeMinutes: row.additional_time_minutes,
        servings: row.servings,
        yield: row.yield,
        ingredients: [],
        steps: [],
      });
    }

    const recipe = recipesMap.get(row.id)!;

    if (row.ing_name != null && !recipe.ingredients.some((i) => i.name === row.ing_name)) {
      recipe.ingredients.push({
        name: row.ing_name,
        amount: row.amount!,
        unit: row.unit!,
      });
    }

    if (row.step_content != null && !recipe.steps.includes(row.step_content)) {
      recipe.steps.push(row.step_content);
    }
  }

  stmt.free();
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
