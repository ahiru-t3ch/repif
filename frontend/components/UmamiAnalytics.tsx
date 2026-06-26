import Script from "next/script";

const scriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

export function UmamiAnalytics() {
  if (!scriptUrl || !websiteId) {
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
