CREATE TABLE recipe (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  name TEXT NOT NULL,
  source TEXT
);

CREATE TABLE recipe_steps (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES recipe(id),
  step_number INTEGER NOT NULL,
  step_content TEXT NOT NULL
);

CREATE TABLE recipe_ingredients (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES recipe(id),
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  unit TEXT NOT NULL
);
