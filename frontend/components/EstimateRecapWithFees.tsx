"use client";

import { DpeRentalAlert } from "@/components/DpeRentalAlert";
import { OptionalNumberInput } from "@/components/OptionalNumberInput";
import {
  AGENCY_FEE_PERCENT,
  agencyFeeAmount,
  agencyFeeAmountFromRate,
  effectiveAgencyFeeRate,
  priceWithAgencyFees,
  type AgencyFeeMode,
} from "@/lib/agency-fees";
import {
  useEstimateSession,
  type PropertyType,
} from "@/lib/estimate-session/context";
import {
  formatFeeRate as formatFeeRateDisplay,
  formatPrice as formatPriceDisplay,
  formatPricePerSqm as formatPricePerSqmDisplay,
} from "@/lib/format-display";
import { useI18n } from "@/lib/i18n/context";
import {
  getNotaryFeeRangeByAge,
  notaryFeeAmount,
  type NotaryPropertyAge,
} from "@/lib/notary-fees";
import {
  cardDarkSectionClassName,
  cardBorderClassName,
  cardEmphasisClassName,
  cardFaintTextClassName,
  cardLabelClassName,
  cardMutedTextClassName,
  cardSubtleTextClassName,
  darkInputClassName,
  inputClassName,
  modeButtonActiveClassName,
  modeButtonInactiveClassName,
  rangeDarkClassName,
  rangeLightClassName,
  sectionCardClassName,
  warningTextClassName,
} from "@/lib/ui-classes";

type EstimateRecapWithFeesProps = {
  variant?: "dark" | "light";
  /** Show address + match score above the price block */
  showAddress?: boolean;
  /** Optional label above the address (e.g. report title) */
  headerLabel?: string;
};

function resultTitle(t: (key: string) => string, type: PropertyType) {
  return type === "APARTMENT"
    ? t("result.estimateApartment")
    : t("result.estimateHouse");
}

export function EstimateRecapWithFees({
  variant = "dark",
  showAddress = false,
  headerLabel,
}: EstimateRecapWithFeesProps) {
  const { t, intlLocale } = useI18n();
  const {
    result,
    adjustedPrice,
    setAdjustedPrice,
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
    modelInputSnapshot,
    propertyType,
  } = useEstimateSession();

  if (!result) {
    return null;
  }

  const estimateResult = result;
  const formatPrice = (value: number) => formatPriceDisplay(intlLocale, value);
  const formatFeeRate = (rate: number) => formatFeeRateDisplay(intlLocale, rate);

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
  const pricePerSqm = formatPricePerSqmDisplay(intlLocale, displayPrice, surfaceUsed);
  const resolvedPropertyType =
    modelInputSnapshot?.propertyType ?? propertyType;

  function handleNotaryPropertyAgeChange(next: NotaryPropertyAge) {
    const range = getNotaryFeeRangeByAge(next);
    setNotaryPropertyAge(next);
    setNotaryFeeRate(range.default);
  }

  function handleAgencyFeeModeChange(next: AgencyFeeMode) {
    setAgencyFeeMode(next);
    if (next === "fixed") {
      const basePrice = adjustedPrice ?? estimateResult.price;
      setAgencyFeeFixed(agencyFeeAmountFromRate(basePrice, agencyFeeRate));
    }
  }

  function formatScore(score: number) {
    return `${Math.round(score * 100)} %`;
  }

  const isDark = variant === "dark";
  const sectionClassName = isDark ? cardDarkSectionClassName : sectionCardClassName;
  const borderClassName = cardBorderClassName(variant);
  const mutedTextClassName = cardMutedTextClassName(variant);
  const labelClassName = cardLabelClassName(variant);
  const subtleClassName = cardSubtleTextClassName(variant);
  const faintClassName = cardFaintTextClassName(variant);
  const emphasisClassName = cardEmphasisClassName(variant);
  const recapInputClassName = isDark ? darkInputClassName : inputClassName;
  const rangeClassName = isDark ? rangeDarkClassName : rangeLightClassName;
  const modeButtonActive = modeButtonActiveClassName(variant);
  const modeButtonInactive = modeButtonInactiveClassName(variant);

  return (
    <section className={sectionClassName}>
      {showAddress && (
        <div className={`mb-5 space-y-2 border-b ${borderClassName} pb-5`}>
          {headerLabel && (
            <p className={`text-xs font-medium uppercase tracking-wide ${subtleClassName}`}>
              {headerLabel}
            </p>
          )}
          <p className={`text-sm leading-relaxed ${mutedTextClassName}`}>
            {t("result.geocodedAddress")}{" "}
            <span className={`font-medium ${emphasisClassName}`}>
              {result.geocoded_address}
            </span>
          </p>
          {result.input_address.trim().toLowerCase() !==
            result.geocoded_address.trim().toLowerCase() && (
            <p className={`text-sm leading-relaxed ${mutedTextClassName}`}>
              {t("result.inputAddress")}{" "}
              <span className={`font-medium ${emphasisClassName}`}>
                {result.input_address}
              </span>
            </p>
          )}
          <p className={`text-sm ${mutedTextClassName}`}>
            {t("result.matchScore")}{" "}
            <span
              className={`font-medium ${
                result.geocode_score < 0.7
                  ? warningTextClassName(variant)
                  : emphasisClassName
              }`}
            >
              {formatScore(result.geocode_score)}
            </span>
          </p>
        </div>
      )}

      <div className={`grid gap-6 border-b ${borderClassName} py-5 sm:grid-cols-2`}>
        <div className="min-w-0">
          <p className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${labelClassName}`}>
            <span>{resultTitle(t, resolvedPropertyType)}</span>
            <span
              className={`font-normal normal-case tracking-normal ${faintClassName}`}
            >
              · {t("result.excludingAgencyFees")}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p
                className={`font-sans text-3xl font-semibold tracking-tight sm:text-4xl ${emphasisClassName}`}
              >
                {formatPrice(displayPrice)}
              </p>
              {rangeHigh > rangeLow && (
                <label className="mt-4 block">
                  <span className={`text-xs ${subtleClassName}`}>
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
                    className={rangeClassName}
                  />
                  <div
                    className={`mt-1 flex justify-between text-xs ${faintClassName}`}
                  >
                    <span>{formatPrice(rangeLow)}</span>
                    <span>{formatPrice(rangeHigh)}</span>
                  </div>
                  {isAdjusted && (
                    <button
                      type="button"
                      onClick={() => setAdjustedPrice(modelPrice)}
                      className={`mt-2 text-xs underline decoration-card-faint underline-offset-2 transition ${
                        isDark
                          ? "text-card-muted hover:text-primary"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {t("result.resetToModelPrice")}
                    </button>
                  )}
                </label>
              )}
            </div>
            {pricePerSqm && (
              <div>
                <p
                  className={`font-sans text-2xl font-semibold tracking-tight sm:text-3xl ${emphasisClassName}`}
                >
                  {pricePerSqm}
                </p>
                <p className={`mt-1 text-sm ${subtleClassName}`}>
                  {t("result.pricePerSqm")}
                </p>
              </div>
            )}
          </div>
          <div className="mt-4">
            <DpeRentalAlert
              dpeValue={String(modelInputSnapshot?.dpeMedian ?? "")}
              variant={isDark ? "dark" : "light"}
            />
          </div>
        </div>

        <div
          className={`min-w-0 border-t ${borderClassName} pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6`}
        >
          <p className={labelClassName}>{t("result.includingAgencyFees")}</p>
          <p
            className={`mt-2 font-sans text-2xl font-semibold tracking-tight sm:text-3xl ${emphasisClassName}`}
          >
            {formatPrice(priceFai)}
          </p>
          <p className={`mt-2 text-sm ${mutedTextClassName}`}>
            {t("result.agencyFeesAmount")}{" "}
            <span className={`font-medium ${emphasisClassName}`}>
              {formatPrice(feeAmount)}
            </span>
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <span className={`text-xs ${subtleClassName}`}>
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
                      ? modeButtonActive
                      : modeButtonInactive
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
              <span className={`text-xs ${subtleClassName}`}>
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
                className={rangeClassName}
              />
            </label>
          ) : (
            <label className="mt-4 block">
              <span className={`text-xs ${subtleClassName}`}>
                {t("result.agencyFeesFixedAmount")}
              </span>
              <OptionalNumberInput
                min={0}
                step={100}
                value={agencyFeeFixed}
                onValueChange={setAgencyFeeFixed}
                emptyValue={0}
                blankWhenEmptyValue
                className={recapInputClassName}
              />
              {result.price > 0 && feeAmount > 0 && (
                <p className={`mt-2 text-xs ${subtleClassName}`}>
                  {t("result.agencyFeesEffectiveRate", {
                    rate: formatFeeRate(effectiveRate),
                  })}
                </p>
              )}
            </label>
          )}
        </div>
      </div>

      <div className={`grid gap-6 pt-5 sm:grid-cols-2`}>
        <div className="min-w-0">
          <p className={labelClassName}>{t("result.notaryFeesTitle")}</p>

          <div className="mt-3 flex flex-col gap-2">
            <span className={`text-xs ${subtleClassName}`}>
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
                      ? modeButtonActive
                      : modeButtonInactive
                  }`}
                >
                  {age === "OLD" ? t("result.notaryOld") : t("result.notaryNew")}
                </button>
              ))}
            </div>
          </div>

          <p className={`mt-3 text-xs ${subtleClassName}`}>
            {notaryPropertyAge === "NEW"
              ? t("result.notaryFeesNewRange")
              : t("result.notaryFeesOldRange")}
          </p>
          <p className={`mt-2 text-sm ${mutedTextClassName}`}>
            {t("result.notaryFeesAmount")}{" "}
            <span className={`font-medium ${emphasisClassName}`}>
              {formatPrice(notaryAmount)}
            </span>
          </p>
          <label className="mt-4 block">
            <span className={`text-xs ${subtleClassName}`}>
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
              className={rangeClassName}
            />
          </label>
          <p className={`mt-2 text-xs ${faintClassName}`}>
            {t("result.notaryFeesBase")}
          </p>
        </div>

        <div
          className={`min-w-0 space-y-2 border-t ${borderClassName} pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6`}
        >
          <p className={`text-sm ${mutedTextClassName}`}>
            {t("result.totalFeesAmount")}{" "}
            <span className={`font-medium ${emphasisClassName}`}>
              {formatPrice(totalFeesAmount)}
            </span>
          </p>
          <p>
            <span className={labelClassName}>{t("result.totalBudget")}</span>
            <span
              className={`mt-2 block font-sans text-2xl font-semibold tracking-tight sm:text-3xl ${emphasisClassName}`}
            >
              {formatPrice(totalBudget)}
            </span>
          </p>
          <p className={`text-xs ${faintClassName}`}>
            {t("result.totalBudgetHint")}
          </p>
        </div>
      </div>
    </section>
  );
}
