import { cookies } from "next/headers";
import Script from "next/script";

/** Set cookie `umami-opt-out=1` on the site to skip Umami on that browser. */
export const UMAMI_OPT_OUT_COOKIE = "umami-opt-out";

const scriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

export async function UmamiAnalytics() {
  if (!scriptUrl || !websiteId) {
    return null;
  }

  const cookieStore = await cookies();
  if (cookieStore.get(UMAMI_OPT_OUT_COOKIE)?.value === "1") {
    return null;
  }

  return (
    <Script
      defer
      src={scriptUrl}
      data-website-id={websiteId}
      strategy="afterInteractive"
    />
  );
}
