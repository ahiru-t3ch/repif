"use client";

import { useEffect, useRef, useState } from "react";

import { AddressAutocomplete } from "@/components/AddressAutocomplete";
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

const OUTBUILDING_COUNT_OPTIONS = [0, 1, 2, 3, 4, 5] as const;

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
        nbParking: Number(nbParking),
        nbCave: Number(nbCave),
        dpeMedian: Number(dpeMedian),
        anneeConstruction: Number(anneeConstruction),
      });
      setResult(data);
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
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-stone-400">
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
