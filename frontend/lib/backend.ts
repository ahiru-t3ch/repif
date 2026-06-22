import { createBackendJwt } from "@/lib/backend-jwt";

const BACKEND_CONFIG_ERROR = "BACKEND_URL is not configured";

export function getBackendUrl(): string {
  const url = process.env.BACKEND_URL?.trim();
  if (!url) {
    throw new Error(BACKEND_CONFIG_ERROR);
  }
  return url.replace(/\/$/, "");
}

export async function backendHeaders(contentType = "application/json"): Promise<HeadersInit> {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers["Content-Type"] = contentType;
  }

  const privateKey = process.env.BACKEND_JWT_PRIVATE_KEY?.trim();
  if (privateKey) {
    headers.Authorization = `Bearer ${await createBackendJwt()}`;
  }

  return headers;
}

export async function proxyBackendResponse(response: Response): Promise<Response> {
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export function backendConfigErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Backend configuration error";
  return Response.json({ detail: message }, { status: 500 });
}
