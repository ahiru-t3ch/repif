import { createBackendJwt } from "@/lib/backend-jwt";

const BACKEND_CONFIG_ERROR = "BACKEND_URL is not configured";

export function getBackendUrl(): string {
  const url = process.env.BACKEND_URL?.trim();
  if (!url) {
    throw new Error(BACKEND_CONFIG_ERROR);
  }
  return url.replace(/\/$/, "");
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export async function backendHeaders(
  contentType = "application/json",
  clientRequest?: Request,
): Promise<HeadersInit> {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  if (clientRequest) {
    headers["X-Forwarded-For"] = getClientIp(clientRequest);
  }

  const privateKey = process.env.BACKEND_JWT_PRIVATE_KEY?.trim();
  if (privateKey) {
    headers.Authorization = `Bearer ${await createBackendJwt()}`;
  }

  return headers;
}

export async function proxyBackendResponse(response: Response): Promise<Response> {
  const body = await response.text();
  const headers: Record<string, string> = {
    "Content-Type": response.headers.get("Content-Type") ?? "application/json",
  };

  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter) {
    headers["Retry-After"] = retryAfter;
  }

  return new Response(body, {
    status: response.status,
    headers,
  });
}

export function backendConfigErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Backend configuration error";
  return Response.json({ detail: message }, { status: 500 });
}
