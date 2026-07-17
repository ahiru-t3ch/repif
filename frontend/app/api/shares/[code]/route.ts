import {
  backendConfigErrorResponse,
  backendHeaders,
  getBackendUrl,
  proxyBackendResponse,
} from "@/lib/backend";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const response = await fetch(
      `${getBackendUrl()}/shares/${encodeURIComponent(code)}`,
      {
        method: "GET",
        headers: await backendHeaders("application/json", request),
        cache: "no-store",
      },
    );
    return proxyBackendResponse(response);
  } catch (error) {
    return backendConfigErrorResponse(error);
  }
}
