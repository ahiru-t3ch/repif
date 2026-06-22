import { SignJWT, importPKCS8, type CryptoKey } from "jose";

const ISSUER = process.env.BACKEND_JWT_ISSUER?.trim() || "repif-frontend";
const AUDIENCE = process.env.BACKEND_JWT_AUDIENCE?.trim() || "repif-backend";
const TTL_SECONDS = Number(process.env.BACKEND_JWT_TTL_SECONDS ?? 300);

let cachedKey: CryptoKey | null = null;

function normalizePem(value: string): string {
  return value.replace(/\\n/g, "\n").trim();
}

async function getPrivateKey(): Promise<CryptoKey> {
  if (cachedKey) {
    return cachedKey;
  }

  const pem = process.env.BACKEND_JWT_PRIVATE_KEY;
  if (!pem?.trim()) {
    throw new Error("BACKEND_JWT_PRIVATE_KEY is not configured");
  }

  const normalized = normalizePem(pem);
  if (normalized.includes("BEGIN RSA PRIVATE KEY")) {
    throw new Error(
      "BACKEND_JWT_PRIVATE_KEY must be PKCS#8 (BEGIN PRIVATE KEY). Regenerate with: bash generate-jwt-keys.sh",
    );
  }

  cachedKey = await importPKCS8(normalized, "RS256");
  return cachedKey;
}

export async function createBackendJwt(): Promise<string> {
  const key = await getPrivateKey();

  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .setJti(crypto.randomUUID())
    .sign(key);
}
