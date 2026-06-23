"use client";

import type { ReactNode } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { EstimateSessionProvider } from "@/lib/estimate-session/context";
import { I18nProvider } from "@/lib/i18n/context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <EstimateSessionProvider>
        <div className="flex min-h-full flex-col">
          <SiteHeader />
          <div className="flex-1">{children}</div>
        </div>
      </EstimateSessionProvider>
    </I18nProvider>
  );
}
