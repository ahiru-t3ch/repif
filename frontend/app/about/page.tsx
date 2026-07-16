"use client";

import { useI18n } from "@/lib/i18n/context";

const AGENCY_FEES_SOURCE_URL =
  "https://levine-immobilier.fr/qui-paie-frais-agence-immobiliere/";

export default function AboutPage() {
  const { t } = useI18n();

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
