"use client";

import { useEffect, useState } from "react";

import { FieldHint } from "@/components/FieldHint";
import { useI18n } from "@/lib/i18n/context";

const AGENCY_FEES_SOURCE_URL =
  "https://levine-immobilier.fr/qui-paie-frais-agence-immobiliere/";

type HoldoutMetrics = {
  r2: number;
  mae_eur: number;
  mape_pct: number;
};

type MetricsPayload = {
  apartment: HoldoutMetrics;
  house: HoldoutMetrics;
};

export default function AboutPage() {
  const { t, intlLocale } = useI18n();
  const [metrics, setMetrics] = useState<MetricsPayload | null>(null);
  const [metricsError, setMetricsError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMetrics() {
      try {
        const response = await fetch("/api/metrics", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          setMetricsError(true);
          return;
        }
        const data = (await response.json()) as MetricsPayload;
        setMetrics(data);
        setMetricsError(false);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setMetricsError(true);
      }
    }

    void loadMetrics();
    return () => controller.abort();
  }, []);

  function formatPercent(value: number) {
    return new Intl.NumberFormat(intlLocale, {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(value / 100);
  }

  function formatR2(value: number) {
    return new Intl.NumberFormat(intlLocale, {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(value);
  }

  function formatMae(value: number) {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12">
      <article className="mx-auto w-full max-w-4xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("about.title")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {t("about.intro")}
        </p>

        <div className="mt-10 space-y-8">
          <section className="space-y-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-foreground">
              {t("about.modelTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              {t("about.modelBody")}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-foreground">
              {t("about.amenitiesTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              {t("about.amenitiesBody")}
            </p>
            <p className="text-sm leading-relaxed text-muted">
              {t("about.amenitiesApartment")}
            </p>
            <p className="text-sm leading-relaxed text-muted">
              {t("about.amenitiesHouse")}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-foreground">
              {t("about.metricsTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              {t("about.metricsIntro")}
            </p>

            {metricsError && (
              <p className="text-sm text-muted" role="status">
                {t("about.metricsError")}
              </p>
            )}

            {!metricsError && !metrics && (
              <p className="text-sm text-muted" role="status">
                {t("about.metricsLoading")}
              </p>
            )}

            {metrics && (
              <div className="grid gap-6 sm:grid-cols-2">
                {(
                  [
                    ["apartment", metrics.apartment],
                    ["house", metrics.house],
                  ] as const
                ).map(([kind, values]) => (
                  <div key={kind} className="space-y-2">
                    <h3 className="text-sm font-medium text-foreground">
                      {kind === "apartment"
                        ? t("about.metricsApartment")
                        : t("about.metricsHouse")}
                    </h3>
                    <dl className="space-y-1.5 text-sm leading-relaxed">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <dt className="flex items-center gap-1.5 text-muted">
                          {t("about.metricsR2")}
                          <FieldHint text={t("about.metricsR2Hint")} />
                        </dt>
                        <dd className="font-medium text-foreground">
                          {formatR2(values.r2)}
                        </dd>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2">
                        <dt className="flex items-center gap-1.5 text-muted">
                          {t("about.metricsMae")}
                          <FieldHint text={t("about.metricsMaeHint")} />
                        </dt>
                        <dd className="font-medium text-foreground">
                          {formatMae(values.mae_eur)}
                        </dd>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2">
                        <dt className="flex items-center gap-1.5 text-muted">
                          {t("about.metricsMape")}
                          <FieldHint text={t("about.metricsMapeHint")} />
                        </dt>
                        <dd className="font-medium text-foreground">
                          {formatPercent(values.mape_pct)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            )}

            <p className="text-sm leading-relaxed text-muted">
              {t("about.metricsNote")}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-foreground">
              {t("about.geocodeTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              {t("about.geocodeBody")}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-foreground">
              {t("about.agencyFeesTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              {t("about.agencyFeesDisclaimer")}
            </p>
            <p className="text-sm leading-relaxed text-muted">
              {t("about.agencyFeesBuyerShareIntro")}{" "}
              <a
                href={AGENCY_FEES_SOURCE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline decoration-stone-400 underline-offset-2 hover:decoration-foreground"
              >
                {t("about.agencyFeesSource")}
              </a>
              {t("about.agencyFeesBuyerShareOutro")}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-foreground">
              {t("about.faiTitle")}
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              {t("about.faiBody")}
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
