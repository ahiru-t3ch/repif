"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { FinanceAnalysis } from "@/components/finance/FinanceAnalysis";
import { useEstimateSession } from "@/lib/estimate-session/context";
import { useI18n } from "@/lib/i18n/context";

export default function AnalysisPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { result } = useEstimateSession();

  useEffect(() => {
    if (!result) {
      router.replace("/");
    }
  }, [result, router]);

  if (!result) {
    return null;
  }

  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="space-y-2">
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t("analysis.pageTitle")}
          </h1>
        </div>
        <FinanceAnalysis />
      </div>
    </main>
  );
}
