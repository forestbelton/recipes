ALTER TABLE recipe_ingredients RENAME COLUMN amount TO amount_old;
ALTER TABLE recipe_ingredients ADD COLUMN amount TEXT NOT NULL DEFAULT '';
UPDATE recipe_ingredients SET amount = CAST(amount_old AS TEXT);
ALTER TABLE recipe_ingredients DROP COLUMN amount_old;
