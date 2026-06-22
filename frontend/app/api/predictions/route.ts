import {
  backendConfigErrorResponse,
  backendHeaders,
  getBackendUrl,
  proxyBackendResponse,
} from "@/lib/backend";

export async function GET() {
  try {
    const response = await fetch(`${getBackendUrl()}/predictions`, {
      cache: "no-store",
      headers: await backendHeaders(""),
    });
    return proxyBackendResponse(response);
  } catch (error) {
    return backendConfigErrorResponse(error);
  }
}
