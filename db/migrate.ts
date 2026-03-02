import initSqlJs from "sql.js";
import { copyFileSync, readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { parse } from "yaml";

const MIGRATIONS_DIR = join(import.meta.dirname, "migrations");
const RECIPES_DIR = join(import.meta.dirname, "recipes");
const PUBLIC_DIR = join(import.meta.dirname, "..", "public");
const OUTPUT_PATH = join(PUBLIC_DIR, "recipes.db");
const WASM_SRC = join(import.meta.dirname, "..", "node_modules", "sql.js", "dist", "sql-wasm-browser.wasm");
const WASM_DEST = join(PUBLIC_DIR, "sql-wasm-browser.wasm");

interface RecipeYaml {
  name: string;
  source?: string | null;
  prep_time_minutes: number;
  cook_time_minutes: number;
  additional_time_minutes: number;
  servings: number;
  yield: string;
  ingredients: { name: string; amount: number; unit: string }[];
  steps: string[];
}

function validateRecipe(data: unknown, filename: string): RecipeYaml {
  if (typeof data !== "object" || data === null) {
    throw new Error(`${filename}: expected an object`);
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.name !== "string" || obj.name.length === 0) {
    throw new Error(`${filename}: "name" must be a non-empty string`);
  }

  if (obj.source !== undefined && obj.source !== null && typeof obj.source !== "string") {
    throw new Error(`${filename}: "source" must be a string or null`);
  }

  if (typeof obj.prep_time_minutes !== "number" || !Number.isInteger(obj.prep_time_minutes)) {
    throw new Error(`${filename}: "prep_time_minutes" must be an integer`);
  }
  if (typeof obj.cook_time_minutes !== "number" || !Number.isInteger(obj.cook_time_minutes)) {
    throw new Error(`${filename}: "cook_time_minutes" must be an integer`);
  }
  if (typeof obj.additional_time_minutes !== "number" || !Number.isInteger(obj.additional_time_minutes)) {
    throw new Error(`${filename}: "additional_time_minutes" must be an integer`);
  }
  if (typeof obj.servings !== "number" || !Number.isInteger(obj.servings)) {
    throw new Error(`${filename}: "servings" must be an integer`);
  }
  if (typeof obj.yield !== "string") {
    throw new Error(`${filename}: "yield" must be a string`);
  }

  if (!Array.isArray(obj.ingredients) || obj.ingredients.length === 0) {
    throw new Error(`${filename}: "ingredients" must be a non-empty array`);
  }

  for (const [i, ing] of (obj.ingredients as unknown[]).entries()) {
    if (typeof ing !== "object" || ing === null) {
      throw new Error(`${filename}: ingredients[${i}] must be an object`);
    }
    const ingObj = ing as Record<string, unknown>;
    if (typeof ingObj.name !== "string" || ingObj.name.length === 0) {
      throw new Error(`${filename}: ingredients[${i}].name must be a non-empty string`);
    }
    if (typeof ingObj.amount !== "number" || isNaN(ingObj.amount)) {
      throw new Error(`${filename}: ingredients[${i}].amount must be a number`);
    }
    if (typeof ingObj.unit !== "string") {
      throw new Error(`${filename}: ingredients[${i}].unit must be a string`);
    }
  }

  if (!Array.isArray(obj.steps) || obj.steps.length === 0) {
    throw new Error(`${filename}: "steps" must be a non-empty array`);
  }

  for (const [i, step] of (obj.steps as unknown[]).entries()) {
    if (typeof step !== "string" || step.length === 0) {
      throw new Error(`${filename}: steps[${i}] must be a non-empty string`);
    }
  }

  return obj as unknown as RecipeYaml;
}

async function migrate() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run("PRAGMA foreign_keys = ON;");

  const migrationFiles = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    console.log(`Applying ${file}...`);
    db.run(sql);
  }

  const tables = db
    .exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .flatMap((r) => r.values.map((v) => v[0]));
  console.log(`Tables: ${tables.join(", ")}`);

  // Ingest YAML recipes
  if (existsSync(RECIPES_DIR)) {
    const yamlFiles = readdirSync(RECIPES_DIR)
      .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
      .sort();

    for (const file of yamlFiles) {
      const raw = readFileSync(join(RECIPES_DIR, file), "utf-8");
      const data = parse(raw);
      const recipe = validateRecipe(data, file);

      const recipeId = randomUUID();
      db.run(
        "INSERT INTO recipe (id, name, source, prep_time_minutes, cook_time_minutes, additional_time_minutes, servings, yield) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          recipeId,
          recipe.name,
          recipe.source ?? null,
          recipe.prep_time_minutes,
          recipe.cook_time_minutes,
          recipe.additional_time_minutes,
          recipe.servings,
          recipe.yield,
        ],
      );

      for (const [i, step] of recipe.steps.entries()) {
        db.run(
          "INSERT INTO recipe_steps (id, recipe_id, step_number, step_content) VALUES (?, ?, ?, ?)",
          [randomUUID(), recipeId, i + 1, step],
        );
      }

      for (const ing of recipe.ingredients) {
        db.run(
          "INSERT INTO recipe_ingredients (id, recipe_id, name, amount, unit) VALUES (?, ?, ?, ?, ?)",
          [randomUUID(), recipeId, ing.name, ing.amount, ing.unit],
        );
      }

      console.log(`Ingested ${file} → ${recipe.name}`);
    }
  }

  if (!existsSync(PUBLIC_DIR)) {
    mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  const dbData = db.export();
  writeFileSync(OUTPUT_PATH, Buffer.from(dbData));
  console.log(`Wrote ${OUTPUT_PATH}`);

  copyFileSync(WASM_SRC, WASM_DEST);
  console.log(`Copied sql-wasm.wasm to ${WASM_DEST}`);

  db.close();
}

migrate();
