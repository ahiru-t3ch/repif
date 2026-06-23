import {
  backendConfigErrorResponse,
  backendHeaders,
  getBackendUrl,
  proxyBackendResponse,
} from "@/lib/backend";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const response = await fetch(`${getBackendUrl()}/predict/apartment`, {
      method: "POST",
      headers: await backendHeaders("application/json", request),
      body,
    });
    return proxyBackendResponse(response);
  } catch (error) {
    return backendConfigErrorResponse(error);
  }
}
