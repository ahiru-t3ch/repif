import {
  backendConfigErrorResponse,
  backendHeaders,
  getBackendUrl,
  proxyBackendResponse,
} from "@/lib/backend";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = searchParams.get("limit") ?? "5";

    if (q.length < 3) {
      return Response.json({ suggestions: [] });
    }

    const upstream = new URL(`${getBackendUrl()}/geocode/suggest`);
    upstream.searchParams.set("q", q);
    upstream.searchParams.set("limit", limit);

    const response = await fetch(upstream, {
      cache: "no-store",
      headers: await backendHeaders("", request),
    });
    return proxyBackendResponse(response);
  } catch (error) {
    return backendConfigErrorResponse(error);
  }
}
