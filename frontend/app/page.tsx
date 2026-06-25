"use client";

import { useState } from "react";
import Link from "next/link";

import { DpeRentalAlert } from "@/components/DpeRentalAlert";
import {
  AGENCY_FEE_PERCENT,
  agencyFeeAmount,
  agencyFeeAmountFromRate,
  effectiveAgencyFeeRate,
  priceWithAgencyFees,
  type AgencyFeeMode,
} from "@/lib/agency-fees";
import {
  DEFAULT_AGENCY_FEE_RATE,
  useEstimateSession,
  type PredictResult,
  type PropertyType,
} from "@/lib/estimate-session/context";
import { dpeValueToLetter } from "@/lib/dpe-rental";
import { useI18n } from "@/lib/i18n/context";
import {
  getNotaryFeeRangeByAge,
  inferNotaryPropertyAge,
  notaryFeeAmount,
  type NotaryPropertyAge,
} from "@/lib/notary-fees";

const DPE_OPTIONS = [
  { value: 1, label: "A" },
  { value: 2, label: "B" },
  { value: 3, label: "C" },
  { value: 4, label: "D" },
  { value: 5, label: "E" },
  { value: 6, label: "F" },
  { value: 7, label: "G" },
] as const;

const COMPANY_URL = "https://www.ahiru-t3ch.com/";

const darkInputClassName =
  "mt-2 w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-white shadow-sm transition focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500";

const inputClassName =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground shadow-sm transition focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200";

const labelClassName = "text-xs font-medium uppercase tracking-wide text-muted";

function FieldHint({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-stone-400 font-serif text-[10px] font-bold leading-none text-muted transition hover:border-stone-600 hover:text-foreground"
      title={text}
      aria-label={text}
    >
      i
    </button>
  );
}

function AdRail() {
  return (
    <aside
      className="hidden min-h-full border-border/60 bg-stone-100/50 lg:block lg:border-x lg:border-dashed"
      aria-hidden="true"
    />
  );
}

export default function Home() {
  const { t, intlLocale } = useI18n();
  const {
    propertyType,
    setPropertyType,
    address,
    setAddress,
    sbati,
    setSbati,
    nblocdep,
    setNblocdep,
    dpeMedian,
    setDpeMedian,
    anneeConstruction,
    setAnneeConstruction,
    result,
    setResult,
    modelInputSnapshot,
    setModelInputSnapshot,
    agencyFeeMode,
    setAgencyFeeMode,
    agencyFeeRate,
    setAgencyFeeRate,
    agencyFeeFixed,
    setAgencyFeeFixed,
    notaryFeeRate,
    setNotaryFeeRate,
    notaryPropertyAge,
    setNotaryPropertyAge,
    error,
    setError,
  } = useEstimateSession();
  const [loading, setLoading] = useState(false);

  function formatScore(score: number) {
    return `${Math.round(score * 100)} %`;
  }

  function formatPrice(value: number) {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatFeeRate(rate: number) {
    return new Intl.NumberFormat(intlLocale, {
      maximumFractionDigits: 1,
    }).format(rate);
  }

  function formatPricePerSqm(netPrice: number, surface: number) {
    if (surface <= 0) {
      return null;
    }

    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(Math.round(netPrice / surface));
  }

  function handleNotaryPropertyAgeChange(next: NotaryPropertyAge) {
    const range = getNotaryFeeRangeByAge(next);
    setNotaryPropertyAge(next);
    setNotaryFeeRate(range.default);
  }

  function handleAgencyFeeModeChange(next: AgencyFeeMode) {
    setAgencyFeeMode(next);
    if (next === "fixed" && result) {
      setAgencyFeeFixed(agencyFeeAmountFromRate(result.price, agencyFeeRate));
    }
  }

  function modelPropertyTypeLabel(type: PropertyType) {
    return type === "APARTMENT" ? t("form.apartment") : t("form.house");
  }

  function resultTitle(type: PropertyType) {
    return type === "APARTMENT" ? t("result.estimateApartment") : t("result.estimateHouse");
  }

  function handlePropertyTypeChange(next: PropertyType) {
    setPropertyType(next);
    setResult(null);
    setModelInputSnapshot(null);
    setError(null);
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setModelInputSnapshot(null);

    const endpoint =
      propertyType === "APARTMENT"
        ? "/api/predict/apartment"
        : "/api/predict/house";

    const body = {
      property_type: propertyType,
      address: address.trim(),
      sbati: Number(sbati),
      nblocdep: Number(nblocdep),
      dpe_median: Number(dpeMedian),
      annee_construction: Number(anneeConstruction),
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let message = t("errors.api", { status: response.status });
        try {
          const payload = (await response.json()) as { detail?: unknown };
          if (typeof payload.detail === "string") {
            message = payload.detail;
          } else if (Array.isArray(payload.detail)) {
            message = payload.detail
              .map((item) => item.msg ?? JSON.stringify(item))
              .join("; ");
          }
        } catch {
          // keep generic message
        }
        throw new Error(message);
      }

      const data: PredictResult = await response.json();
      const notaryAge = inferNotaryPropertyAge(Number(anneeConstruction));
      const notaryRange = getNotaryFeeRangeByAge(notaryAge);
      setAgencyFeeMode("percent");
      setAgencyFeeRate(DEFAULT_AGENCY_FEE_RATE);
      setAgencyFeeFixed(0);
      setNotaryPropertyAge(notaryAge);
      setNotaryFeeRate(notaryRange.default);
      setModelInputSnapshot({
        propertyType,
        address: address.trim(),
        sbati: Number(sbati),
        nblocdep: Number(nblocdep),
        dpeMedian: Number(dpeMedian),
        anneeConstruction: Number(anneeConstruction),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.unknown"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[1fr_min(100%,28rem)_1fr] xl:grid-cols-[1fr_min(100%,32rem)_1fr]">
      <AdRail />

      <main className="px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto flex max-w-lg flex-col gap-8">
          <div className="space-y-2 text-center sm:text-left">
            <h1 className="sr-only">{t("meta.title")}</h1>
            <p className="text-sm leading-relaxed text-muted">
              {t("meta.description")}
            </p>
          </div>

          <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <label className="flex flex-col gap-2">
                <span className={labelClassName}>{t("form.propertyType")}</span>
                <select
                  value={propertyType}
                  onChange={(e) =>
                    handlePropertyTypeChange(e.target.value as PropertyType)
                  }
                  className={inputClassName}
                >
                  <option value="APARTMENT">{t("form.apartment")}</option>
                  <option value="HOUSE">{t("form.house")}</option>
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className={labelClassName}>{t("form.address")}</span>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  minLength={10}
                  maxLength={255}
                  placeholder={t("form.addressPlaceholder")}
                  required
                  className={inputClassName}
                />
              </label>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-2">
                <label className="flex flex-col gap-2 sm:contents">
                  <span
                    className={`${labelClassName} sm:col-start-1 sm:row-start-1 sm:flex sm:min-h-11 sm:items-end`}
                  >
                    {t("form.surface")}
                  </span>
                  <input
                    type="number"
                    value={sbati}
                    onChange={(e) => setSbati(e.target.value)}
                    min={11}
                    step={0.01}
                    required
                    className={`${inputClassName} sm:col-start-1 sm:row-start-2`}
                  />
                </label>

                <label className="flex flex-col gap-2 sm:contents">
                  <span
                    className={`${labelClassName} flex items-center gap-1.5 normal-case sm:col-start-2 sm:row-start-1 sm:min-h-11 sm:items-end`}
                  >
                    {t("form.outbuildings")}
                    <FieldHint text={t("form.outbuildingsHint")} />
                  </span>
                  <input
                    type="number"
                    value={nblocdep}
                    onChange={(e) => setNblocdep(e.target.value)}
                    min={0}
                    required
                    className={`${inputClassName} sm:col-start-2 sm:row-start-2`}
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className={labelClassName}>{t("form.dpe")}</span>
                  <select
                    value={dpeMedian}
                    onChange={(e) => setDpeMedian(e.target.value)}
                    required
                    className={inputClassName}
                  >
                    <option value="" disabled>
                      {t("form.dpeSelect")}
                    </option>
                    {DPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className={labelClassName}>{t("form.year")}</span>
                  <input
                    type="number"
                    value={anneeConstruction}
                    onChange={(e) => setAnneeConstruction(e.target.value)}
                    min={1501}
                    max={new Date().getFullYear()}
                    required
                    className={inputClassName}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? t("form.submitting") : t("form.submit")}
              </button>
            </form>
          </section>

          {error && (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {error}
            </p>
          )}

          {result && (() => {
            const feeAmount = agencyFeeAmount(
              result.price,
              agencyFeeMode,
              agencyFeeRate,
              agencyFeeFixed,
            );
            const priceFai = priceWithAgencyFees(
              result.price,
              agencyFeeMode,
              agencyFeeRate,
              agencyFeeFixed,
            );
            const effectiveRate = effectiveAgencyFeeRate(result.price, feeAmount);
            const notaryRange = getNotaryFeeRangeByAge(notaryPropertyAge);
            const notaryAmount = notaryFeeAmount(result.price, notaryFeeRate);
            const totalFeesAmount = feeAmount + notaryAmount;
            const totalBudget = priceFai + notaryAmount;
            const surfaceUsed = modelInputSnapshot?.sbati ?? 0;
            const pricePerSqm = formatPricePerSqm(result.price, surfaceUsed);

            return (
            <section className="rounded-2xl border border-stone-800 bg-accent px-6 py-7 text-white sm:px-8">
              <div className="space-y-2 border-b border-stone-700 pb-5 text-sm leading-relaxed text-stone-300">
                <p>
                  {t("result.geocodedAddress")}{" "}
                  <span className="font-medium text-white">
                    {result.geocoded_address}
                  </span>
                </p>
                {result.input_address.trim().toLowerCase() !==
                  result.geocoded_address.trim().toLowerCase() && (
                  <p>
                    {t("result.inputAddress")}{" "}
                    <span className="font-medium text-white">
                      {result.input_address}
                    </span>
                  </p>
                )}
                <p>
                  {t("result.matchScore")}{" "}
                  <span
                    className={`font-medium ${
                      result.geocode_score < 0.7
                        ? "text-amber-300"
                        : "text-white"
                    }`}
                  >
                    {formatScore(result.geocode_score)}
                  </span>
                </p>

                {modelInputSnapshot && (
                  <div className="mt-4 border-t border-stone-700 pt-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                      {t("result.modelInputTitle")}
                    </p>
                    <dl className="mt-2 grid gap-1.5">
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-stone-400">{t("form.propertyType")} :</dt>
                        <dd className="font-medium text-white">
                          {modelPropertyTypeLabel(modelInputSnapshot.propertyType)}
                        </dd>
                      </div>
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-stone-400">{t("form.surface")} :</dt>
                        <dd className="font-medium text-white">
                          {new Intl.NumberFormat(intlLocale, {
                            maximumFractionDigits: 2,
                          }).format(modelInputSnapshot.sbati)}{" "}
                          m²
                        </dd>
                      </div>
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-stone-400">{t("form.outbuildings")} :</dt>
                        <dd className="font-medium text-white">
                          {modelInputSnapshot.nblocdep}
                        </dd>
                      </div>
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-stone-400">{t("form.dpe")} :</dt>
                        <dd className="font-medium text-white">
                          {dpeValueToLetter(modelInputSnapshot.dpeMedian) ??
                            modelInputSnapshot.dpeMedian}
                        </dd>
                      </div>
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-stone-400">{t("form.year")} :</dt>
                        <dd className="font-medium text-white">
                          {modelInputSnapshot.anneeConstruction}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </div>

              <p className="mt-5 text-xs font-medium uppercase tracking-[0.15em] text-stone-400">
                {resultTitle(modelInputSnapshot?.propertyType ?? propertyType)}
              </p>

              <div className="mt-2 flex flex-wrap items-end gap-x-8 gap-y-3">
                <div>
                  <p className="font-sans text-3xl font-semibold tracking-tight sm:text-4xl">
                    {formatPrice(result.price)}
                  </p>
                  <p className="mt-1 text-sm text-stone-400">
                    {t("result.excludingAgencyFees")}
                  </p>
                </div>
                {pricePerSqm && (
                  <div>
                    <p className="font-sans text-2xl font-semibold tracking-tight sm:text-3xl">
                      {pricePerSqm}
                    </p>
                    <p className="mt-1 text-sm text-stone-400">
                      {t("result.pricePerSqm")}
                    </p>
                  </div>
                )}
              </div>
              <Link
                href="/explication-prix"
                className="mt-2 inline-block text-sm text-stone-300 underline decoration-stone-500 underline-offset-2 transition hover:text-white"
              >
                {t("result.priceExplanationLink")}
              </Link>

              <div className="mt-4">
                <DpeRentalAlert
                  dpeValue={String(modelInputSnapshot?.dpeMedian ?? "")}
                  variant="dark"
                />
              </div>

              <div className="mt-6 border-t border-stone-700 pt-5">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-stone-400">
                  {t("result.includingAgencyFees")}
                </p>
                <p className="mt-2 font-sans text-2xl font-semibold tracking-tight sm:text-3xl">
                  {formatPrice(priceFai)}
                </p>
                <p className="mt-2 text-sm text-stone-300">
                  {t("result.agencyFeesAmount")}{" "}
                  <span className="font-medium text-white">
                    {formatPrice(feeAmount)}
                  </span>
                </p>

                <div className="mt-4 flex flex-col gap-2">
                  <span className="text-xs text-stone-400">
                    {t("result.agencyFeeMode")}
                  </span>
                  <div className="flex gap-2">
                    {(["percent", "fixed"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleAgencyFeeModeChange(mode)}
                        aria-pressed={agencyFeeMode === mode}
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
                          agencyFeeMode === mode
                            ? "bg-white text-stone-900"
                            : "bg-stone-700 text-stone-300 hover:bg-stone-600 hover:text-white"
                        }`}
                      >
                        {mode === "percent"
                          ? t("result.agencyFeeModePercent")
                          : t("result.agencyFeeModeFixed")}
                      </button>
                    ))}
                  </div>
                </div>

                {agencyFeeMode === "percent" ? (
                  <label className="mt-4 block">
                    <span className="text-xs text-stone-400">
                      {t("result.agencyFeesRate", {
                        rate: formatFeeRate(agencyFeeRate),
                      })}
                    </span>
                    <input
                      type="range"
                      min={AGENCY_FEE_PERCENT.min}
                      max={AGENCY_FEE_PERCENT.max}
                      step={AGENCY_FEE_PERCENT.step}
                      value={agencyFeeRate}
                      onChange={(e) => setAgencyFeeRate(Number(e.target.value))}
                      aria-valuemin={AGENCY_FEE_PERCENT.min}
                      aria-valuemax={AGENCY_FEE_PERCENT.max}
                      aria-valuenow={agencyFeeRate}
                      className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-600 accent-white"
                    />
                  </label>
                ) : (
                  <label className="mt-4 block">
                    <span className="text-xs text-stone-400">
                      {t("result.agencyFeesFixedAmount")}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={agencyFeeFixed || ""}
                      onChange={(e) =>
                        setAgencyFeeFixed(Math.max(0, Number(e.target.value) || 0))
                      }
                      className={darkInputClassName}
                    />
                    {result.price > 0 && feeAmount > 0 && (
                      <p className="mt-2 text-xs text-stone-400">
                        {t("result.agencyFeesEffectiveRate", {
                          rate: formatFeeRate(effectiveRate),
                        })}
                      </p>
                    )}
                  </label>
                )}
              </div>

              <div className="mt-6 border-t border-stone-700 pt-5">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-stone-400">
                  {t("result.notaryFeesTitle")}
                </p>

                <div className="mt-3 flex flex-col gap-2">
                  <span className="text-xs text-stone-400">
                    {t("result.notaryPropertyAge")}
                  </span>
                  <div className="flex gap-2">
                    {(["OLD", "NEW"] as const).map((age) => (
                      <button
                        key={age}
                        type="button"
                        onClick={() => handleNotaryPropertyAgeChange(age)}
                        aria-pressed={notaryPropertyAge === age}
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
                          notaryPropertyAge === age
                            ? "bg-white text-stone-900"
                            : "bg-stone-700 text-stone-300 hover:bg-stone-600 hover:text-white"
                        }`}
                      >
                        {age === "OLD"
                          ? t("result.notaryOld")
                          : t("result.notaryNew")}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="mt-3 text-xs text-stone-400">
                  {notaryPropertyAge === "NEW"
                    ? t("result.notaryFeesNewRange")
                    : t("result.notaryFeesOldRange")}
                </p>
                <p className="mt-2 text-sm text-stone-300">
                  {t("result.notaryFeesAmount")}{" "}
                  <span className="font-medium text-white">
                    {formatPrice(notaryAmount)}
                  </span>
                </p>
                <label className="mt-4 block">
                  <span className="text-xs text-stone-400">
                    {t("result.notaryFeesRate", {
                      rate: formatFeeRate(notaryFeeRate),
                    })}
                  </span>
                  <input
                    type="range"
                    min={notaryRange.min}
                    max={notaryRange.max}
                    step={notaryRange.step}
                    value={notaryFeeRate}
                    onChange={(e) => setNotaryFeeRate(Number(e.target.value))}
                    aria-valuemin={notaryRange.min}
                    aria-valuemax={notaryRange.max}
                    aria-valuenow={notaryFeeRate}
                    className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-600 accent-white"
                  />
                </label>
                <p className="mt-2 text-xs text-stone-500">
                  {t("result.notaryFeesBase")}
                </p>
              </div>

              <div className="mt-6 space-y-2 border-t border-stone-700 pt-5">
                <p className="text-sm text-stone-300">
                  {t("result.totalFeesAmount")}{" "}
                  <span className="font-medium text-white">
                    {formatPrice(totalFeesAmount)}
                  </span>
                </p>
                <p>
                  <span className="text-xs font-medium uppercase tracking-[0.15em] text-stone-400">
                    {t("result.totalBudget")}
                  </span>
                  <span className="mt-2 block font-sans text-2xl font-semibold tracking-tight sm:text-3xl">
                    {formatPrice(totalBudget)}
                  </span>
                </p>
                <p className="text-xs text-stone-500">
                  {t("result.totalBudgetHint")}
                </p>
              </div>
            </section>
            );
          })()}

          <footer className="text-center text-xs text-muted">
            {t("footer.copyright")} · {t("footer.prefix")}{" "}
            <a
              href={COMPANY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-stone-400 underline-offset-2 hover:text-foreground"
            >
              {t("footer.company")}
            </a>
          </footer>
        </div>
      </main>

      <AdRail />
    </div>
  );
}
