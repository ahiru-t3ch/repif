#!/bin/sh
# Remove stale .joblib / .json from models_back, keeping only the active prod set.
# Usage (on VPS, from repo or copied script):
#   sh prune-artifacts.sh /backend/models_back          # dry-run (default)
#   sh prune-artifacts.sh /backend/models_back --apply  # delete files
#
# Override keep list via KEEP_FILES (space-separated basenames).

set -eu

TARGET_DIR="${1:-/backend/models_back}"
MODE="${2:-}"

DEFAULT_KEEP="
apartment_prod_20260723_144015.joblib
house_prod_20260723_162418.joblib
metrics_prod_20260723_144015_apartment.json
metrics_prod_20260723_162418_house.json
commune_price_m2_lookup_apartment.json
commune_price_m2_lookup_house.json
"

KEEP_FILES="${KEEP_FILES:-$DEFAULT_KEEP}"

if [ ! -d "$TARGET_DIR" ]; then
  echo "Directory not found: $TARGET_DIR" >&2
  exit 1
fi

is_kept() {
  file="$1"
  for keep in $KEEP_FILES README.md .gitkeep; do
    if [ "$file" = "$keep" ]; then
      return 0
    fi
  done
  return 1
}

echo "Target: $TARGET_DIR"
echo "Keep:"
for keep in $KEEP_FILES README.md .gitkeep; do
  echo "  - $keep"
done
echo

TO_DELETE=""
for path in "$TARGET_DIR"/*; do
  [ -e "$path" ] || continue
  file=$(basename "$path")
  case "$file" in
    *.joblib|*.json)
      if is_kept "$file"; then
        echo "KEEP  $file"
      else
        echo "DROP  $file"
        TO_DELETE="$TO_DELETE $path"
      fi
      ;;
    *)
      echo "SKIP  $file (not .joblib/.json)"
      ;;
  esac
done

if [ -z "$TO_DELETE" ]; then
  echo
  echo "Nothing to delete."
  exit 0
fi

echo
if [ "$MODE" != "--apply" ]; then
  echo "Dry-run only. Re-run with --apply to delete:"
  echo "  sh $0 $TARGET_DIR --apply"
  exit 0
fi

for path in $TO_DELETE; do
  rm -f "$path"
done

echo "Deleted stale artifacts."
ls -lh "$TARGET_DIR"
