# Recipes

A client-side recipe browser built with React, TypeScript, and SQLite (via sql.js/WASM). Recipes are stored as YAML files, compiled into a SQLite database at build time, and served as a static single-page application.

**[View the app](https://forestbelton.github.io/recipes)**

## Features

- Browse and search recipes by name
- View ingredients, step-by-step instructions, and timing details
- Fully client-side — no backend required
- SQLite database runs in the browser via WebAssembly

## Getting Started

```bash
npm install
npm run db:migrate   # Build the SQLite database from YAML recipes
npm run dev          # Start the dev server
```

## Adding Recipes

Add a YAML file to `db/recipes/`:

```yaml
name: Recipe Name
source: https://example.com
prep_time_minutes: 20
cook_time_minutes: 50
additional_time_minutes: 0
servings: 8
yield: "1 (9-inch) pie"
ingredients:
  - name: Ingredient
    amount: "1"
    unit: cups
steps:
  - First step
  - Second step
```

Then run `npm run db:migrate` to rebuild the database.

## Scripts

| Command              | Description                                                   |
| -------------------- | ------------------------------------------------------------- |
| `npm run dev`        | Start development server                                      |
| `npm run build`      | Production build                                              |
| `npm run db:migrate` | Generate SQLite database from YAML recipes and SQL migrations |
| `npm run lint`       | Run ESLint                                                    |
| `npm run preview`    | Preview production build locally                              |
