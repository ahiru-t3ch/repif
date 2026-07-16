"use client";

import { useEffect, useRef, useState } from "react";

import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { DpeRentalAlert } from "@/components/DpeRentalAlert";
import { FieldHint } from "@/components/FieldHint";
import { SavingsChart } from "@/components/SavingsChart";
import {
  AGENCY_FEE_PERCENT,
  agencyFeeAmount,
  agencyFeeAmountFromRate,
  effectiveAgencyFeeRate,
  priceWithAgencyFees,
  type AgencyFeeMode,
} from "@/lib/agency-fees";
import {
  DEFAULT_INFLATION_RATE,
  DEFAULT_SAVINGS_RATE,
  inflationAdjustedValue,
  savingsSnapshot,
  yearlySeries,
} from "@/lib/compound-savings";
import {
  DEFAULT_AGENCY_FEE_RATE,
  DEFAULT_LOAN_DOWN_PAYMENT,
  DEFAULT_LOAN_DURATION_YEARS,
  DEFAULT_LOAN_INSURANCE_RATE,
  DEFAULT_LOAN_INTEREST_RATE,
  createEmptyWorkLine,
  useEstimateSession,
  type PredictResult,
  type PropertyType,
} from "@/lib/estimate-session/context";
import { dpeValueToLetter } from "@/lib/dpe-rental";
import { useI18n } from "@/lib/i18n/context";
import {
  loanPrincipal,
  monthlyTotalPayment,
  totalCreditCost,
} from "@/lib/mortgage";
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

const OUTBUILDING_COUNT_OPTIONS = [0, 1, 2, 3, 4, 5] as const;

const COMPANY_URL = "https://www.ahiru-t3ch.com/";

const darkInputClassName =
  "mt-2 w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-white shadow-sm transition focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500";

const inputClassName =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground shadow-sm transition focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200";

const labelClassName = "text-xs font-medium uppercase tracking-wide text-muted";

export default function Home() {
  const { t, intlLocale } = useI18n();
  const {
    propertyType,
    setPropertyType,
    address,
    setAddress,
    sbati,
    setSbati,
    nbParking,
    setNbParking,
    nbCave,
    setNbCave,
    dpeMedian,
    setDpeMedian,
    anneeConstruction,
    setAnneeConstruction,
    result,
    setResult,
    adjustedPrice,
    setAdjustedPrice,
    workLines,
    setWorkLines,
    loanDownPayment,
    setLoanDownPayment,
    loanDurationYears,
    setLoanDurationYears,
    loanInterestRate,
    setLoanInterestRate,
    loanInsuranceRate,
    setLoanInsuranceRate,
    savingsRate,
    setSavingsRate,
    savingsInflation,
    setSavingsInflation,
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
  const [formExpanded, setFormExpanded] = useState(() => !result);
  const resultRef = useRef<HTMLElement>(null);
  const formSectionRef = useRef<HTMLElement>(null);

  function handleExpandForm() {
    setFormExpanded(true);
    requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useEffect(() => {
    if (result && !formExpanded) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result, formExpanded]);

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
      const basePrice = adjustedPrice ?? result.price;
      setAgencyFeeFixed(agencyFeeAmountFromRate(basePrice, agencyFeeRate));
    }
  }

  function modelPropertyTypeLabel(type: PropertyType) {
    return type === "APARTMENT" ? t("form.apartment") : t("form.house");
  }

  function resultTitle(type: PropertyType) {
    return type === "APARTMENT" ? t("result.estimateApartment") : t("result.estimateHouse");
  }

  function resetLoanDefaults() {
    setLoanDownPayment(DEFAULT_LOAN_DOWN_PAYMENT);
    setLoanDurationYears(DEFAULT_LOAN_DURATION_YEARS);
    setLoanInterestRate(DEFAULT_LOAN_INTEREST_RATE);
    setLoanInsuranceRate(DEFAULT_LOAN_INSURANCE_RATE);
  }

  function resetSavingsDefaults() {
    setSavingsRate(DEFAULT_SAVINGS_RATE);
    setSavingsInflation(DEFAULT_INFLATION_RATE);
  }

  function handlePropertyTypeChange(next: PropertyType) {
    setPropertyType(next);
    setResult(null);
    setAdjustedPrice(null);
    setWorkLines([]);
    resetLoanDefaults();
    resetSavingsDefaults();
    setModelInputSnapshot(null);
    setError(null);
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setAdjustedPrice(null);
    setWorkLines([]);
    resetLoanDefaults();
    resetSavingsDefaults();
    setModelInputSnapshot(null);

    const endpoint =
      propertyType === "APARTMENT"
        ? "/api/predict/apartment"
        : "/api/predict/house";

    const body = {
      property_type: propertyType,
      address: address.trim(),
      sbati: Number(sbati),
      nblocdep: Number(nbParking) + Number(nbCave),
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
            message =
              payload.detail === "LOCATION_NOT_COVERED"
                ? t("errors.locationNotCovered")
                : payload.detail;
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
        nbParking: Number(nbParking),
        nbCave: Number(nbCave),
        dpeMedian: Number(dpeMedian),
        anneeConstruction: Number(anneeConstruction),
      });
      setResult(data);
      setAdjustedPrice(Math.round(data.price));
      setWorkLines([createEmptyWorkLine()]);
      setFormExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.unknown"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="px-5 py-10 sm:px-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="sr-only">{t("meta.title")}</h1>
          <p className="text-sm leading-relaxed text-muted">
            {t("meta.description")}
          </p>
        </div>

          {result && (() => {
            const displayPrice = adjustedPrice ?? Math.round(result.price);
            const rangeLow = Math.round(result.price_low);
            const rangeHigh = Math.round(result.price_high);
            const modelPrice = Math.round(result.price);
            const isAdjusted = displayPrice !== modelPrice;
            const feeAmount = agencyFeeAmount(
              displayPrice,
              agencyFeeMode,
              agencyFeeRate,
              agencyFeeFixed,
            );
            const priceFai = priceWithAgencyFees(
              displayPrice,
              agencyFeeMode,
              agencyFeeRate,
              agencyFeeFixed,
            );
            const effectiveRate = effectiveAgencyFeeRate(displayPrice, feeAmount);
            const notaryRange = getNotaryFeeRangeByAge(notaryPropertyAge);
            const notaryAmount = notaryFeeAmount(displayPrice, notaryFeeRate);
            const totalFeesAmount = feeAmount + notaryAmount;
            const totalBudget = priceFai + notaryAmount;
            const surfaceUsed = modelInputSnapshot?.sbati ?? 0;
            const pricePerSqm = formatPricePerSqm(displayPrice, surfaceUsed);

            return (
            <section
              ref={resultRef}
              className="scroll-mt-24 rounded-2xl border border-stone-800 bg-accent px-6 py-7 text-white sm:px-8"
            >
              <div className="grid gap-6 border-b border-stone-700 pb-5 sm:grid-cols-2">
                <div className="min-w-0 space-y-2 text-sm leading-relaxed text-stone-300">
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
                </div>

                {modelInputSnapshot && (
                  <div className="min-w-0 border-t border-stone-700 pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
                    <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                      {t("result.modelInputTitle")}
                    </p>
                    <dl className="mt-2 grid gap-1.5 text-sm leading-relaxed">
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
                        <dt className="text-stone-400">{t("form.parking")} :</dt>
                        <dd className="font-medium text-white">
                          {modelInputSnapshot.nbParking}
                        </dd>
                      </div>
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-stone-400">{t("form.cave")} :</dt>
                        <dd className="font-medium text-white">
                          {modelInputSnapshot.nbCave}
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

              <div className="grid gap-6 border-b border-stone-700 py-5 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-[0.15em] text-stone-400">
                    <span>
                      {resultTitle(modelInputSnapshot?.propertyType ?? propertyType)}
                    </span>
                    <span className="font-normal normal-case tracking-normal text-stone-500">
                      · {t("result.excludingAgencyFees")}
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-end gap-x-8 gap-y-3">
                    <div>
                      <p className="font-sans text-3xl font-semibold tracking-tight sm:text-4xl">
                        {formatPrice(displayPrice)}
                      </p>
                      {rangeHigh > rangeLow && (
                        <label className="mt-4 block">
                          <span className="text-xs text-stone-400">
                            {t("result.adjustWithinRange")}
                          </span>
                          <input
                            type="range"
                            min={rangeLow}
                            max={rangeHigh}
                            step={1000}
                            value={Math.min(rangeHigh, Math.max(rangeLow, displayPrice))}
                            onChange={(e) => setAdjustedPrice(Number(e.target.value))}
                            aria-valuemin={rangeLow}
                            aria-valuemax={rangeHigh}
                            aria-valuenow={displayPrice}
                            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-600 accent-white"
                          />
                          <div className="mt-1 flex justify-between text-xs text-stone-500">
                            <span>{formatPrice(rangeLow)}</span>
                            <span>{formatPrice(rangeHigh)}</span>
                          </div>
                          {isAdjusted && (
                            <button
                              type="button"
                              onClick={() => setAdjustedPrice(modelPrice)}
                              className="mt-2 text-xs text-stone-300 underline decoration-stone-500 underline-offset-2 transition hover:text-white"
                            >
                              {t("result.resetToModelPrice")}
                            </button>
                          )}
                        </label>
                      )}
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
                  <div className="mt-4">
                    <DpeRentalAlert
                      dpeValue={String(modelInputSnapshot?.dpeMedian ?? "")}
                      variant="dark"
                    />
                  </div>
                </div>

                <div className="min-w-0 border-t border-stone-700 pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
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
              </div>

              <div className="grid gap-6 pt-5 sm:grid-cols-2">
                <div className="min-w-0">
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

                <div className="min-w-0 space-y-2 border-t border-stone-700 pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
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
              </div>
            </section>
            );
          })()}

          {result && (() => {
            const displayPrice = adjustedPrice ?? Math.round(result.price);
            const worksTotal = workLines.reduce(
              (sum, line) => sum + Math.max(0, line.amount),
              0,
            );
            const priceFai = priceWithAgencyFees(
              displayPrice,
              agencyFeeMode,
              agencyFeeRate,
              agencyFeeFixed,
            );
            const notaryAmount = notaryFeeAmount(displayPrice, notaryFeeRate);
            const priceWithWorks = priceFai + notaryAmount + worksTotal;

            function updateWorkLine(
              id: string,
              patch: Partial<{ label: string; amount: number }>,
            ) {
              setWorkLines((lines) =>
                lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
              );
            }

            function removeWorkLine(id: string) {
              setWorkLines((lines) => {
                const next = lines.filter((line) => line.id !== id);
                return next.length > 0 ? next : [createEmptyWorkLine()];
              });
            }

            return (
              <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                  {t("result.worksTitle")}
                </p>
                <p className="mt-2 text-sm text-muted">{t("result.worksHint")}</p>

                <ul className="mt-4 space-y-3">
                  {workLines.map((line) => (
                    <li
                      key={line.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                    >
                      <input
                        type="text"
                        value={line.label}
                        onChange={(e) =>
                          updateWorkLine(line.id, { label: e.target.value })
                        }
                        placeholder={t("result.worksLabelPlaceholder")}
                        aria-label={t("result.worksLabelPlaceholder")}
                        className={`${inputClassName} min-w-0 flex-1`}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step={100}
                          value={line.amount || ""}
                          onChange={(e) =>
                            updateWorkLine(line.id, {
                              amount: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          placeholder={t("result.worksAmountPlaceholder")}
                          aria-label={t("result.worksAmountPlaceholder")}
                          className={`${inputClassName} w-full sm:w-36`}
                        />
                        <button
                          type="button"
                          onClick={() => removeWorkLine(line.id)}
                          className="shrink-0 rounded-lg px-2.5 py-2 text-xs text-muted transition hover:bg-stone-100 hover:text-foreground"
                          aria-label={t("result.worksRemoveLine")}
                        >
                          {t("result.worksRemoveLine")}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() =>
                    setWorkLines((lines) => [...lines, createEmptyWorkLine()])
                  }
                  className="mt-3 text-sm font-medium text-foreground underline-offset-2 transition hover:underline"
                >
                  {t("result.worksAddLine")}
                </button>

                <div className="mt-4 space-y-2 border-t border-border pt-4">
                  <p className="text-sm text-muted">
                    {t("result.worksTotal")}{" "}
                    <span className="font-medium text-foreground">
                      {formatPrice(worksTotal)}
                    </span>
                  </p>
                  <p>
                    <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                      {t("result.worksNewPrice")}
                    </span>
                    <span className="mt-2 block font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                      {formatPrice(priceWithWorks)}
                    </span>
                  </p>
                  <p className="text-xs text-muted">
                    {t("result.worksNewPriceHint")}
                  </p>
                </div>
              </section>
            );
          })()}

          {result && (() => {
            const displayPrice = adjustedPrice ?? Math.round(result.price);
            const worksTotal = workLines.reduce(
              (sum, line) => sum + Math.max(0, line.amount),
              0,
            );
            const priceFai = priceWithAgencyFees(
              displayPrice,
              agencyFeeMode,
              agencyFeeRate,
              agencyFeeFixed,
            );
            const notaryAmount = notaryFeeAmount(displayPrice, notaryFeeRate);
            const projectBudget = priceFai + notaryAmount + worksTotal;
            const principal = loanPrincipal(projectBudget, loanDownPayment);
            const monthly = monthlyTotalPayment(
              principal,
              loanInterestRate,
              loanDurationYears,
              loanInsuranceRate,
            );
            const creditCost = totalCreditCost(
              principal,
              loanInterestRate,
              loanDurationYears,
              loanInsuranceRate,
            );

            return (
              <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                  {t("result.loanTitle")}
                </p>
                <p className="mt-2 text-sm text-muted">{t("result.loanHint")}</p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className={labelClassName}>{t("result.loanDownPayment")}</span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={loanDownPayment || ""}
                      onChange={(e) =>
                        setLoanDownPayment(Math.max(0, Number(e.target.value) || 0))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className={labelClassName}>{t("result.loanDuration")}</span>
                    <input
                      type="number"
                      min={1}
                      max={35}
                      step={1}
                      value={loanDurationYears || ""}
                      onChange={(e) =>
                        setLoanDurationYears(
                          Math.min(35, Math.max(1, Number(e.target.value) || 1)),
                        )
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className={labelClassName}>{t("result.loanInterestRate")}</span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.05}
                      value={loanInterestRate}
                      onChange={(e) =>
                        setLoanInterestRate(Math.max(0, Number(e.target.value) || 0))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className={labelClassName}>{t("result.loanInsuranceRate")}</span>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      step={0.01}
                      value={loanInsuranceRate}
                      onChange={(e) =>
                        setLoanInsuranceRate(Math.max(0, Number(e.target.value) || 0))
                      }
                      className={inputClassName}
                    />
                  </label>
                </div>

                <div className="mt-4 space-y-2 border-t border-border pt-4">
                  <p className="text-sm text-muted">
                    {t("result.loanPrincipal")}{" "}
                    <span className="font-medium text-foreground">
                      {formatPrice(principal)}
                    </span>
                  </p>
                  <p className="text-sm text-muted">
                    {t("result.loanCreditCost")}{" "}
                    <span className="font-medium text-foreground">
                      {formatPrice(Math.round(creditCost))}
                    </span>
                  </p>
                  <p>
                    <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                      {t("result.loanMonthly")}
                    </span>
                    <span className="mt-2 block font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                      {formatPrice(Math.round(monthly))}
                    </span>
                  </p>
                  <p className="text-xs text-muted">{t("result.loanMonthlyHint")}</p>
                </div>
              </section>
            );
          })()}

          {result && (() => {
            const displayPrice = adjustedPrice ?? Math.round(result.price);
            const worksTotal = workLines.reduce(
              (sum, line) => sum + Math.max(0, line.amount),
              0,
            );
            const priceFai = priceWithAgencyFees(
              displayPrice,
              agencyFeeMode,
              agencyFeeRate,
              agencyFeeFixed,
            );
            const notaryAmount = notaryFeeAmount(displayPrice, notaryFeeRate);
            const projectBudget = priceFai + notaryAmount + worksTotal;
            const principal = loanPrincipal(projectBudget, loanDownPayment);
            const loanMonthly = Math.round(
              monthlyTotalPayment(
                principal,
                loanInterestRate,
                loanDurationYears,
                loanInsuranceRate,
              ),
            );
            const initialCapital = loanDownPayment;
            const monthlyDeposit = loanMonthly;
            const years = Math.max(1, Math.round(loanDurationYears));
            const snap = savingsSnapshot(
              initialCapital,
              monthlyDeposit,
              savingsRate,
              years,
            );
            const series = yearlySeries(
              initialCapital,
              monthlyDeposit,
              savingsRate,
              years,
            );
            const realFutureValue = inflationAdjustedValue(
              snap.futureValue,
              savingsInflation,
              years,
            );
            const interestShare = Math.round(snap.interestSharePct);

            return (
              <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                  {t("result.savingsTitle")}
                </p>
                <p className="mt-2 text-sm text-muted">{t("result.savingsHint")}</p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className={labelClassName}>{t("result.savingsInitial")}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {formatPrice(initialCapital)}
                    </p>
                  </div>
                  <div>
                    <p className={labelClassName}>{t("result.savingsMonthly")}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {formatPrice(monthlyDeposit)}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {t("result.savingsMonthlyNote")}
                    </p>
                  </div>
                  <div>
                    <p className={labelClassName}>{t("result.savingsYears")}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {years}
                    </p>
                  </div>
                  <label className="flex flex-col gap-2">
                    <span className={labelClassName}>
                      {t("result.savingsRate")}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      step={0.1}
                      value={savingsRate}
                      onChange={(e) =>
                        setSavingsRate(Math.max(0, Number(e.target.value) || 0))
                      }
                      className={inputClassName}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className={labelClassName}>
                      {t("result.savingsInflation")}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      step={0.1}
                      value={savingsInflation}
                      onChange={(e) =>
                        setSavingsInflation(Math.max(0, Number(e.target.value) || 0))
                      }
                      className={inputClassName}
                    />
                  </label>
                </div>

                <SavingsChart
                  series={series}
                  contributionsLabel={t("result.savingsChartContributions")}
                  interestLabel={t("result.savingsChartInterest")}
                />

                <div className="mt-4 space-y-2 border-t border-border pt-4">
                  <p className="text-sm text-muted">
                    {t("result.savingsContributions")}{" "}
                    <span className="font-medium text-foreground">
                      {formatPrice(Math.round(snap.totalContributions))}
                    </span>
                  </p>
                  <p className="text-sm text-muted">
                    {t("result.savingsInterest")}{" "}
                    <span className="font-medium text-foreground">
                      {formatPrice(Math.round(snap.totalInterest))}
                    </span>
                  </p>
                  <p className="text-sm text-muted">
                    {t("result.savingsFinalNominal")}{" "}
                    <span className="font-medium text-foreground">
                      {formatPrice(Math.round(snap.futureValue))}
                    </span>
                  </p>
                  <p>
                    <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                      {t("result.savingsFinalReal")}
                    </span>
                    <span className="mt-2 block font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                      {formatPrice(Math.round(realFutureValue))}
                    </span>
                  </p>
                  <p className="text-xs text-muted">
                    {t("result.savingsInflationHint", {
                      inflation: formatFeeRate(savingsInflation),
                    })}
                  </p>
                  <p className="text-xs text-muted">
                    {t("result.savingsInsight", {
                      years: String(years),
                      rate: formatFeeRate(savingsRate),
                      share: String(interestShare),
                    })}
                  </p>
                  <p className="text-xs text-muted">{t("result.savingsRatesNote")}</p>
                </div>
              </section>
            );
          })()}

          {error && (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {error}
            </p>
          )}

          <section
            ref={formSectionRef}
            className="scroll-mt-24 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8"
          >
            {result && !formExpanded ? (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted">
                  {t("form.collapsedSummary", {
                    summary: `${modelPropertyTypeLabel(
                      modelInputSnapshot?.propertyType ?? propertyType,
                    )} · ${result.geocoded_address}`,
                  })}
                </p>
                <button
                  type="button"
                  onClick={handleExpandForm}
                  className="rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground transition hover:border-stone-400 hover:bg-stone-50"
                >
                  {t("form.expandForm")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {result && (
                  <p className="rounded-lg border border-border bg-stone-50 px-3 py-2 text-sm text-muted">
                    {t("form.editHint")}
                  </p>
                )}
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
                  <AddressAutocomplete
                    value={address}
                    onChange={setAddress}
                    minLength={10}
                    maxLength={255}
                    placeholder={t("form.addressPlaceholder")}
                    required
                    listLabel={t("form.addressSuggestions")}
                    loadingLabel={t("form.addressSuggestionsLoading")}
                    className={inputClassName}
                  />
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className={labelClassName}>{t("form.surface")}</span>
                    <input
                      type="number"
                      value={sbati}
                      onChange={(e) => setSbati(e.target.value)}
                      min={11}
                      step={0.01}
                      required
                      className={inputClassName}
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span
                      className={`${labelClassName} flex items-center gap-1.5 normal-case`}
                    >
                      {t("form.parking")}
                      <FieldHint text={t("form.parkingHint")} />
                    </span>
                    <select
                      value={nbParking}
                      onChange={(e) => setNbParking(e.target.value)}
                      required
                      className={inputClassName}
                    >
                      <option value="" disabled>
                        {t("form.dpeSelect")}
                      </option>
                      {OUTBUILDING_COUNT_OPTIONS.map((count) => (
                        <option key={count} value={count}>
                          {count}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span
                      className={`${labelClassName} flex items-center gap-1.5 normal-case`}
                    >
                      {t("form.cave")}
                      <FieldHint text={t("form.caveHint")} />
                    </span>
                    <select
                      value={nbCave}
                      onChange={(e) => setNbCave(e.target.value)}
                      required
                      className={inputClassName}
                    >
                      <option value="" disabled>
                        {t("form.dpeSelect")}
                      </option>
                      {OUTBUILDING_COUNT_OPTIONS.map((count) => (
                        <option key={count} value={count}>
                          {count}
                        </option>
                      ))}
                    </select>
                  </label>

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
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
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
            )}
          </section>

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
  );
}
