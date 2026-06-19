#!/bin/bash
set -euo pipefail

DATA=/dumps

PSQL=(psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB")

# First Tables Structure
"${PSQL[@]}" -f "$DATA/dvf_plus_init.sql"

# Annex Tables Referencial
"${PSQL[@]}" -f "$DATA/dvf_plus_annexe.sql"

# Departments Tables

## All Departments
#for f in "$DATA"/dvf_plus_d*.sql; do
#  echo "[dvf] Loading $f"
#  "${PSQL[@]}" -f "$f"
#done

# 31 and 34 only for tests
for dep in 31 34; do
  echo "[dvf] Loading d$dep"
  "${PSQL[@]}" -f "$DATA/dvf_plus_d$dep.sql"
done