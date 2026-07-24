"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useEstimateSession } from "@/lib/estimate-session/context";
import { useI18n } from "@/lib/i18n/context";
import { fetchShareScenario, sharedScenarioIncludesAnalysis } from "@/lib/share-scenario";

export default function SharedScenarioPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const { hydrateFromShare } = useEstimateSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = typeof params.code === "string" ? params.code : "";
    if (!code) {
      setError(t("share.notFound"));
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const shared = await fetchShareScenario(code);
        if (cancelled) {
          return;
        }
        hydrateFromShare(shared.payload);
        router.replace(
          sharedScenarioIncludesAnalysis(shared.payload) ? "/analysis" : "/",
        );
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : t("share.notFound"));
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [params.code, hydrateFromShare, router, t]);

  return (
    <main className="px-5 py-16 sm:px-8">
      <div className="mx-auto w-full max-w-lg text-center">
        {error ? (
          <>
            <p className="text-base font-medium text-foreground">{error}</p>
            <button
              type="button"
              onClick={() => router.replace("/")}
              className="mt-6 text-sm text-muted underline underline-offset-4 transition hover:text-foreground"
            >
              {t("share.backHome")}
            </button>
          </>
        ) : (
          <p className="text-sm text-muted">{t("share.loading")}</p>
        )}
      </div>
    </main>
  );
}
