import {
  backendConfigErrorResponse,
  backendHeaders,
  getBackendUrl,
  proxyBackendResponse,
} from "@/lib/backend";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const limit = searchParams.get("limit") ?? "5";

    if (q.length < 3) {
      return Response.json({ suggestions: [] }, { headers: NO_STORE_HEADERS });
    }

    const upstream = new URL(`${getBackendUrl()}/geocode/suggest`);
    upstream.searchParams.set("q", q);
    upstream.searchParams.set("limit", limit);

    const response = await fetch(upstream, {
      cache: "no-store",
      headers: await backendHeaders("", request),
    });
    const proxied = await proxyBackendResponse(response);
    const headers = new Headers(proxied.headers);
    headers.set("Cache-Control", NO_STORE_HEADERS["Cache-Control"]);
    return new Response(proxied.body, {
      status: proxied.status,
      headers,
    });
  } catch (error) {
    return backendConfigErrorResponse(error);
  }
}
