"use client";

import Link from "next/link";

import { useI18n } from "@/lib/i18n/context";

const AGENCY_FEES_SOURCE_URL =
  "https://levine-immobilier.fr/qui-paie-frais-agence-immobiliere/";

export default function ExplicationPrixPage() {
  const { t } = useI18n();

  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12">
      <article className="mx-auto w-full max-w-4xl">
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
  );
}
