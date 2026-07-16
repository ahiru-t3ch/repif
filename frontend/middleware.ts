import { NextRequest, NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/rate-limit";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/predict/") && request.method === "POST") {
    const result = enforceRateLimit(request, "predict");
    if (!result.ok) {
      return NextResponse.json(
        { detail: "Too many requests. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(result.retryAfter) },
        },
      );
    }
  }

  if (path === "/api/predictions" && request.method === "GET") {
    const result = enforceRateLimit(request, "predictions");
    if (!result.ok) {
      return NextResponse.json(
        { detail: "Too many requests. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(result.retryAfter) },
        },
      );
    }
  }

  if (path === "/api/geocode/suggest" && request.method === "GET") {
    const result = enforceRateLimit(request, "suggest");
    if (!result.ok) {
      return NextResponse.json(
        { detail: "Too many requests. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(result.retryAfter) },
        },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/predict/:path*", "/api/predictions", "/api/geocode/suggest"],
};
