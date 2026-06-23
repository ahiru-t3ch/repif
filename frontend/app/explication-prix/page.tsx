"use client";

import Link from "next/link";

import { useI18n } from "@/lib/i18n/context";

const AGENCY_FEES_SOURCE_URL =
  "https://levine-immobilier.fr/qui-paie-frais-agence-immobiliere/";

function AdRail() {
  return (
    <aside
      className="hidden min-h-full border-border/60 bg-stone-100/50 lg:block lg:border-x lg:border-dashed"
      aria-hidden="true"
    />
  );
}

export default function ExplicationPrixPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[1fr_min(100%,28rem)_1fr] xl:grid-cols-[1fr_min(100%,32rem)_1fr]">
      <AdRail />

      <main className="px-5 py-10 sm:px-8 sm:py-12">
        <article className="mx-auto max-w-lg">
          <Link
            href="/"
            className="text-sm text-muted transition hover:text-foreground"
          >
            ← {t("explanation.back")}
          </Link>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
            {t("explanation.title")}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {t("explanation.intro")}
          </p>

          <div className="mt-10 space-y-8">
            <section className="space-y-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-foreground">
                {t("explanation.modelTitle")}
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                {t("explanation.modelBody")}
              </p>
              <p className="text-sm leading-relaxed text-muted">
                {t("explanation.modelBeta")}
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-foreground">
                {t("explanation.geocodeTitle")}
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                {t("explanation.geocodeBody")}
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-foreground">
                {t("explanation.agencyFeesTitle")}
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                {t("explanation.agencyFeesDisclaimer")}
              </p>
              <p className="text-sm leading-relaxed text-muted">
                {t("explanation.agencyFeesBuyerShareIntro")}{" "}
                <a
                  href={AGENCY_FEES_SOURCE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline decoration-stone-400 underline-offset-2 hover:decoration-foreground"
                >
                  {t("explanation.agencyFeesSource")}
                </a>
                {t("explanation.agencyFeesBuyerShareOutro")}
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-medium uppercase tracking-wide text-foreground">
                {t("explanation.faiTitle")}
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                {t("explanation.faiBody")}
              </p>
            </section>
          </div>
        </article>
      </main>

      <AdRail />
    </div>
  );
}
