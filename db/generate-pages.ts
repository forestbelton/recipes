import initSqlJs from "sql.js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const DIST_DIR = join(import.meta.dirname, "..", "dist");
const DB_PATH = join(DIST_DIR, "recipes.db");
const INDEX_PATH = join(DIST_DIR, "index.html");
const BASE = "/recipes/";

interface RecipeRow {
  id: string;
  name: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: string;
  ingredient_count: number;
  step_count: number;
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return h === 1 ? "1 hr" : `${h} hr`;
  return `${h} hr ${m} min`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function generate() {
  const SQL = await initSqlJs();
  const buffer = readFileSync(DB_PATH);
  const db = new SQL.Database(new Uint8Array(buffer));
  const template = readFileSync(INDEX_PATH, "utf-8");

  const rows = db.exec(`
    SELECT r.id, r.name, r.prep_time_minutes, r.cook_time_minutes, r.servings,
           (SELECT COUNT(*) FROM recipe_ingredients ri WHERE ri.recipe_id = r.id) AS ingredient_count,
           (SELECT COUNT(*) FROM recipe_steps rs WHERE rs.recipe_id = r.id) AS step_count
    FROM recipe r
  `);

  if (rows.length === 0) {
    console.log("No recipes found.");
    db.close();
    return;
  }

  const columns = rows[0].columns;
  for (const values of rows[0].values) {
    const row: Record<string, unknown> = {};
    columns.forEach((col, i) => (row[col] = values[i]));
    const recipe = row as unknown as RecipeRow;

    const parts: string[] = [];
    const totalTime = recipe.prep_time_minutes + recipe.cook_time_minutes;
    if (totalTime > 0) parts.push(formatDuration(totalTime));
    parts.push(`${recipe.servings} servings`);
    parts.push(`${recipe.ingredient_count} ingredients`);
    parts.push(`${recipe.step_count} steps`);
    const description = parts.join(" · ");

    const url = `${BASE}recipe/${recipe.id}`;
    const metaTags = [
      `<meta property="og:title" content="${escapeHtml(recipe.name)}" />`,
      `<meta property="og:description" content="${escapeHtml(description)}" />`,
      `<meta property="og:type" content="article" />`,
      `<meta property="og:url" content="${escapeHtml(url)}" />`,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    ].join("\n    ");

    const html = template
      .replace("<title>recipes</title>", `<title>${escapeHtml(recipe.name)} — recipes</title>\n    ${metaTags}`);

    const dir = join(DIST_DIR, "recipe", recipe.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), html);
    console.log(`Generated ${url}`);
  }

  // Copy index.html as 404.html for SPA fallback
  writeFileSync(join(DIST_DIR, "404.html"), template);
  console.log("Generated 404.html");

  db.close();
}

generate();
