#!/usr/bin/env python3
"""Fetch an allrecipes.com recipe and write it as a YAML file to db/recipes/."""

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("Missing dependency: requests\n  pip install requests")

try:
    from bs4 import BeautifulSoup
except ImportError:
    sys.exit("Missing dependency: beautifulsoup4\n  pip install beautifulsoup4")

try:
    import yaml
except ImportError:
    sys.exit("Missing dependency: pyyaml\n  pip install pyyaml")


# ---------------------------------------------------------------------------
# ISO 8601 duration parsing
# ---------------------------------------------------------------------------

def parse_iso_duration_minutes(duration_str):
    """Parse an ISO 8601 duration like 'PT1H20M' into total minutes."""
    if not duration_str:
        return 0
    m = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration_str)
    if not m:
        return 0
    hours = int(m.group(1) or 0)
    minutes = int(m.group(2) or 0)
    return hours * 60 + minutes


# ---------------------------------------------------------------------------
# Decimal-to-fraction conversion
# ---------------------------------------------------------------------------

FRACTION_MAP = [
    (0.125, "1/8"),
    (0.25, "1/4"),
    (1 / 3, "1/3"),
    (0.5, "1/2"),
    (2 / 3, "2/3"),
    (0.75, "3/4"),
]


def decimal_to_fraction(value):
    """Convert a float to a whole + fraction string like '1 3/4'.

    Returns an int when there is no fractional part.
    """
    if value < 0:
        return str(value)

    whole = int(value)
    frac = value - whole

    if frac < 0.05:
        return whole if whole else whole

    for threshold, representation in FRACTION_MAP:
        if abs(frac - threshold) < 0.05:
            if whole:
                return f"{whole} {representation}"
            return representation

    # Fallback: round to two decimals
    if whole:
        return f"{whole}.{round(frac * 100):02d}".rstrip("0").rstrip(".")
    return round(value, 2)


# ---------------------------------------------------------------------------
# Ingredient parsing
# ---------------------------------------------------------------------------

KNOWN_UNITS = (
    "cup", "cups",
    "teaspoon", "teaspoons", "tsp",
    "tablespoon", "tablespoons", "tbsp",
    "pound", "pounds",
    "ounce", "ounces", "oz",
    "clove", "cloves",
    "can", "cans",
    "pinch", "pinches",
    "slice", "slices",
    "head", "heads",
    "bunch", "bunches",
    "sprig", "sprigs",
    "stalk", "stalks",
    "quart", "quarts",
    "pint", "pints",
    "gallon", "gallons",
    "liter", "liters",
    "milliliter", "milliliters", "ml",
    "gram", "grams", "g",
    "kilogram", "kilograms", "kg",
    "dash", "dashes",
    "drop", "drops",
    "package", "packages",
    "envelope", "envelopes",
    "jar", "jars",
    "bottle", "bottles",
    "bag", "bags",
    "box", "boxes",
    "container", "containers",
    "stick", "sticks",
    "piece", "pieces",
    "sheet", "sheets",
    "link", "links",
    "ear", "ears",
    "cube", "cubes",
    "fillet", "fillets",
    "breast", "breasts",
    "thigh", "thighs",
    "leg", "legs",
    "rack", "racks",
)

UNIT_PATTERN = re.compile(
    r"^(\d+(?:\.\d+)?)\s+(?:(" + "|".join(re.escape(u) for u in KNOWN_UNITS) + r")\s+)?(.+)$",
    re.IGNORECASE,
)


def normalize_unit(unit):
    """Normalize units to a consistent plural/abbreviated form matching the reference."""
    UNIT_NORMALIZE = {
        "cup": "cups", "cups": "cups",
        "teaspoon": "tsp", "teaspoons": "tsp", "tsp": "tsp",
        "tablespoon": "tbsp", "tablespoons": "tbsp", "tbsp": "tbsp",
        "pound": "pounds", "pounds": "pounds",
        "ounce": "ounces", "ounces": "ounces", "oz": "ounces",
        "clove": "cloves", "cloves": "cloves",
        "can": "cans", "cans": "cans",
        "pinch": "pinches", "pinches": "pinches",
        "slice": "slices", "slices": "slices",
        "head": "heads", "heads": "heads",
        "bunch": "bunches", "bunches": "bunches",
        "sprig": "sprigs", "sprigs": "sprigs",
        "stalk": "stalks", "stalks": "stalks",
        "quart": "quarts", "quarts": "quarts",
        "pint": "pints", "pints": "pints",
        "gallon": "gallons", "gallons": "gallons",
        "liter": "liters", "liters": "liters",
        "milliliter": "milliliters", "milliliters": "milliliters", "ml": "milliliters",
        "gram": "grams", "grams": "grams", "g": "grams",
        "kilogram": "kilograms", "kilograms": "kilograms", "kg": "kilograms",
        "dash": "dashes", "dashes": "dashes",
        "drop": "drops", "drops": "drops",
        "package": "packages", "packages": "packages",
        "envelope": "envelopes", "envelopes": "envelopes",
        "jar": "jars", "jars": "jars",
        "bottle": "bottles", "bottles": "bottles",
        "bag": "bags", "bags": "bags",
        "box": "boxes", "boxes": "boxes",
        "container": "containers", "containers": "containers",
        "stick": "sticks", "sticks": "sticks",
        "piece": "pieces", "pieces": "pieces",
        "sheet": "sheets", "sheets": "sheets",
        "link": "links", "links": "links",
        "ear": "ears", "ears": "ears",
        "cube": "cubes", "cubes": "cubes",
        "fillet": "fillets", "fillets": "fillets",
        "breast": "breasts", "breasts": "breasts",
        "thigh": "thighs", "thighs": "thighs",
        "leg": "legs", "legs": "legs",
        "rack": "racks", "racks": "racks",
    }
    return UNIT_NORMALIZE.get(unit.lower(), unit) if unit else ""


def parse_ingredient(text):
    """Parse an ingredient string into {name, amount, unit}.

    Examples:
        '1 pound skinless, boneless chicken breast halves - cubed'
        → {name: 'skinless, boneless chicken breast halves, cubed', amount: 1, unit: 'pounds'}

        '0.5 cup sliced celery'
        → {name: 'sliced celery', amount: '1/2', unit: 'cups'}
    """
    # Clean up dashes used as separators
    text = re.sub(r"\s+-\s+", ", ", text).strip()

    m = UNIT_PATTERN.match(text)
    if not m:
        # No numeric amount found — return the whole string as name
        return {"name": text, "amount": "", "unit": ""}

    raw_amount = float(m.group(1))
    raw_unit = m.group(2) or ""
    name = m.group(3).strip()

    amount = decimal_to_fraction(raw_amount)
    unit = normalize_unit(raw_unit)

    return {"name": name, "amount": amount, "unit": unit}


# ---------------------------------------------------------------------------
# YAML formatting
# ---------------------------------------------------------------------------

class RecipeDumper(yaml.SafeDumper):
    """Custom YAML dumper that formats recipes like the reference files."""
    pass


def str_representer(dumper, data):
    if "\n" in data:
        return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")
    # Use quotes for strings that look like numbers or contain special chars
    if data and (data[0].isdigit() or data[0] in "-."):
        return dumper.represent_scalar("tag:yaml.org,2002:str", data, style='"')
    return dumper.represent_scalar("tag:yaml.org,2002:str", data)


RecipeDumper.add_representer(str, str_representer)


def format_yaml(recipe):
    """Produce YAML output matching the reference format."""
    lines = []

    lines.append(f"name: {recipe['name']}")
    lines.append(f"source: {recipe['source']}")
    lines.append(f"prep_time_minutes: {recipe['prep_time_minutes']}")
    lines.append(f"cook_time_minutes: {recipe['cook_time_minutes']}")
    lines.append(f"additional_time_minutes: {recipe['additional_time_minutes']}")
    lines.append(f"servings: {recipe['servings']}")

    yield_val = recipe.get("yield", "")
    if yield_val:
        lines.append(f'yield: "{yield_val}"')

    lines.append("ingredients:")
    for ing in recipe["ingredients"]:
        amount = ing["amount"]
        # Quote fraction strings, leave integers unquoted
        if isinstance(amount, str):
            amount_str = f'"{amount}"'
        else:
            amount_str = str(amount)

        unit = ing["unit"]
        if unit:
            unit_str = unit
        else:
            unit_str = '""'

        lines.append(f"  - name: {ing['name']}")
        lines.append(f"    amount: {amount_str}")
        lines.append(f"    unit: {unit_str}")

    lines.append("steps:")
    for step in recipe["steps"]:
        lines.append(f"  - {step}")

    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# Main logic
# ---------------------------------------------------------------------------

def _is_recipe_type(obj):
    """Check if a JSON-LD object has @type Recipe (string or list)."""
    t = obj.get("@type")
    if isinstance(t, list):
        return "Recipe" in t
    return t == "Recipe"


def extract_jsonld_recipe(html):
    """Extract the Recipe JSON-LD object from the HTML page."""
    soup = BeautifulSoup(html, "html.parser")
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)
        except (json.JSONDecodeError, TypeError):
            continue

        # Could be a single object or a list
        objects = data if isinstance(data, list) else [data]
        for obj in objects:
            if _is_recipe_type(obj):
                return obj
            # Sometimes wrapped in @graph
            if "@graph" in obj:
                for item in obj["@graph"]:
                    if _is_recipe_type(item):
                        return item
    return None


def slug_from_url(url):
    """Extract a filename slug from an allrecipes URL.

    Example: 'https://www.allrecipes.com/recipe/26317/chicken-pot-pie-ix/'
           → 'chicken-pot-pie-ix'
    """
    path = url.rstrip("/").split("/")
    # Find the last non-empty path segment
    for segment in reversed(path):
        if segment and not segment.isdigit():
            return segment
    return "recipe"


def build_recipe(data, url):
    """Transform a JSON-LD Recipe object into our YAML structure."""
    prep = parse_iso_duration_minutes(data.get("prepTime"))
    cook = parse_iso_duration_minutes(data.get("cookTime"))
    total = parse_iso_duration_minutes(data.get("totalTime"))
    additional = max(0, total - prep - cook)

    # Parse servings/yield from recipeYield
    recipe_yield = data.get("recipeYield", [])
    if isinstance(recipe_yield, str):
        recipe_yield = [recipe_yield]

    servings = ""
    yield_str = ""
    for item in recipe_yield:
        item_str = str(item).strip()
        if item_str.isdigit() and not servings:
            servings = item_str
        elif not item_str.isdigit():
            yield_str = item_str

    # Parse ingredients
    ingredients = []
    for ing_str in data.get("recipeIngredient", []):
        ingredients.append(parse_ingredient(ing_str))

    # Parse steps
    steps = []
    for step in data.get("recipeInstructions", []):
        if isinstance(step, dict):
            steps.append(step.get("text", ""))
        else:
            steps.append(str(step))

    return {
        "name": data.get("name", ""),
        "source": url,
        "prep_time_minutes": prep,
        "cook_time_minutes": cook,
        "additional_time_minutes": additional,
        "servings": servings,
        "yield": yield_str,
        "ingredients": ingredients,
        "steps": steps,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Import a recipe from allrecipes.com into db/recipes/"
    )
    parser.add_argument("url", help="Full URL of the allrecipes.com recipe page")
    args = parser.parse_args()

    url = args.url

    print(f"Fetching {url} ...")
    response = requests.get(url, headers={
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }, timeout=30)
    response.raise_for_status()

    data = extract_jsonld_recipe(response.text)
    if not data:
        sys.exit("Error: Could not find a Recipe JSON-LD block on the page.")

    recipe = build_recipe(data, url)

    slug = slug_from_url(url)
    out_dir = Path(__file__).resolve().parent.parent / "db" / "recipes"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{slug}.yaml"

    yaml_text = format_yaml(recipe)
    out_path.write_text(yaml_text)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
