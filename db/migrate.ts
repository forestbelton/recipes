import initSqlJs from "sql.js";
import { copyFileSync, readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(import.meta.dirname, "migrations");
const PUBLIC_DIR = join(import.meta.dirname, "..", "public");
const OUTPUT_PATH = join(PUBLIC_DIR, "recipes.db");
const WASM_SRC = join(import.meta.dirname, "..", "node_modules", "sql.js", "dist", "sql-wasm-browser.wasm");
const WASM_DEST = join(PUBLIC_DIR, "sql-wasm-browser.wasm");

async function migrate() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run("PRAGMA foreign_keys = ON;");

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    console.log(`Applying ${file}...`);
    db.run(sql);
  }

  // Verify tables were created
  const tables = db
    .exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .flatMap((r) => r.values.map((v) => v[0]));
  console.log(`Tables: ${tables.join(", ")}`);

  if (!existsSync(PUBLIC_DIR)) {
    mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  const data = db.export();
  writeFileSync(OUTPUT_PATH, Buffer.from(data));
  console.log(`Wrote ${OUTPUT_PATH}`);

  copyFileSync(WASM_SRC, WASM_DEST);
  console.log(`Copied sql-wasm.wasm to ${WASM_DEST}`);

  db.close();
}

migrate();
