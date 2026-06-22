import {
  backendConfigErrorResponse,
  getBackendUrl,
  proxyBackendResponse,
} from "@/lib/backend";

export async function GET() {
  try {
    const response = await fetch(`${getBackendUrl()}/predictions`, {
      cache: "no-store",
    });
    return proxyBackendResponse(response);
  } catch (error) {
    return backendConfigErrorResponse(error);
  }
}
