#!/usr/bin/env bash
# Generate RS256 key pair for Next.js (private) and FastAPI (public).
# Run from the repo root: bash generate-jwt-keys.sh
set -euo pipefail

OUT_DIR="${1:-.}"
PRIVATE="${OUT_DIR}/repif-jwt-private.pem"
PUBLIC="${OUT_DIR}/repif-jwt-public.pem"

openssl genpkey -algorithm RSA -out "$PRIVATE" -pkeyopt rsa_keygen_bits:2048
chmod 600 "$PRIVATE"
openssl rsa -in "$PRIVATE" -pubout -out "$PUBLIC"

echo "Created:"
echo "  $PRIVATE  → BACKEND_JWT_PRIVATE_KEY (frontend / Coolify frontend env)"
echo "  $PUBLIC   → BACKEND_JWT_PUBLIC_KEY (backend / Coolify backend env)"
echo ""
echo "Do not commit these files. Add to .env / Coolify UI (PEM or single-line with \\n)."
