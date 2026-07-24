"use client";

import { useEffect, useRef, useState } from "react";

import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { DpeRentalAlert } from "@/components/DpeRentalAlert";
import { FieldHint } from "@/components/FieldHint";
import { OptionalNumberInput } from "@/components/OptionalNumberInput";
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
  DEFAULT_CASH_SAVINGS_YEARS,
  DEFAULT_INFLATION_RATE,
  DEFAULT_SAVINGS_RATE,
  inflationAdjustedValue,
  savingsSnapshot,
  yearlySeries,
} from "@/lib/compound-savings";
import {
  DEFAULT_AGENCY_FEE_RATE,
  DEFAULT_ANNUAL_CHARGES,
  DEFAULT_EXCEPTIONAL_CHARGES_PCT,
  DEFAULT_LOAN_DOWN_PAYMENT,
  DEFAULT_LOAN_DURATION_YEARS,
  DEFAULT_LOAN_INSURANCE_RATE,
  DEFAULT_LOAN_INTEREST_RATE,
  DEFAULT_MAINTENANCE_PCT,
  DEFAULT_MARGINAL_TAX_RATE,
  DEFAULT_NET_SALARY,
  DEFAULT_NOTARY_FEE_RATE,
  DEFAULT_OCCUPANCY_RATE,
  DEFAULT_PROPERTY_APPRECIATION,
  DEFAULT_PROPERTY_TAX,
  DEFAULT_RENTAL_TAX_REGIME,
  createEmptyWorkLine,
  useEstimateSession,
  type MarginalTaxRate,
  type OccupancyRate,
  type PredictResult,
  type PropertyType,
  type RentalTaxRegime,
} from "@/lib/estimate-session/context";
import {
  applyMarketAdjustments,
  isBalconyApplicable,
  isFloorAdjustmentApplicable,
  isUnpopularTowerApplicable,
} from "@/lib/amenity-uplift";
import {
  CONDITION_POSTS,
  CONDITION_RATING_OPTIONS,
  computeOverallConditionScore,
  conditionScoreToAdjustmentPct,
  createEmptyConditionRatings,
  hasAnyConditionRating,
  parseConditionRating,
} from "@/lib/property-condition";
import { dpeValueToLetter } from "@/lib/dpe-rental";
import { useI18n } from "@/lib/i18n/context";
import {
  buyNetWorth,
  annualLoanInterestFirstYear,
  annualMaintenanceBudget,
  annualRentalIncomeTax,
  cashOnCashReturn,
  cashEquityAtPurchase,
  defaultMonthlyRent,
  effectiveAnnualCharges,
  effectiveMonthlyRent,
  grossRentalYield,
  loanFinancingBase,
  loanPrincipal,
  MARGINAL_TAX_RATES,
  MAX_DEBT_RATIO_PCT,
  MICRO_FONCIER_GROSS_CEILING,
  OCCUPANCY_RATE_OPTIONS,
  monthlyInvestmentCashFlow,
  monthlyInvestableWhenRenting,
  monthlyOwnershipCosts,
  monthlyTotalPayment,
  netNetRentalYield,
  netRentalYield,
  RENTAL_SOCIAL_CONTRIBUTIONS_PCT,
  rentSavedOverYears,
  totalCreditCost,
} from "@/lib/mortgage";
import {
  getNotaryFeeRangeByAge,
  inferNotaryPropertyAge,
  notaryFeeAmount,
  type NotaryPropertyAge,
} from "@/lib/notary-fees";
import {
  SHARE_PAYLOAD_VERSION,
  createShareScenario,
} from "@/lib/share-scenario";

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
const ROOM_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

const COMPANY_URL = "https://www.ahiru-t3ch.com/";

const darkInputClassName =
  "mt-2 w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-white shadow-sm transition focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-500";

const inputClassName =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground shadow-sm transition focus:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200";

const labelClassName = "text-xs font-medium uppercase tracking-wide text-muted";

function FinanceSectionToggle({
  title,
  hint,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 ${
        disabled ? "opacity-55" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        aria-label={title}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            onCheckedChange(!checked);
          }
        }}
        className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition ${
          disabled
            ? "cursor-not-allowed bg-stone-200"
            : checked
              ? "bg-stone-800"
              : "bg-stone-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
            checked && !disabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function ShareScenarioControls({
  variant,
  status,
  message,
  onShare,
  buttonLabel,
  creatingLabel,
  copiedLabel,
}: {
  variant: "dark" | "light";
  status: "idle" | "loading" | "copied" | "error";
  message: string | null;
  onShare: () => void;
  buttonLabel: string;
  creatingLabel: string;
  copiedLabel: string;
}) {
  const isDark = variant === "dark";
  return (
    <div className={`flex flex-col ${isDark ? "items-end" : "items-stretch sm:items-start"} gap-1`}>
      <button
        type="button"
        onClick={onShare}
        disabled={status === "loading"}
        className={
          isDark
            ? "rounded-md border border-stone-500 px-3 py-1.5 text-sm font-medium text-white transition hover:border-stone-300 hover:bg-stone-800 disabled:cursor-wait disabled:opacity-60"
            : "rounded-md bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-wait disabled:opacity-60"
        }
      >
        {status === "loading"
          ? creatingLabel
          : status === "copied"
            ? copiedLabel
            : buttonLabel}
      </button>
      {message && (
        <p
          className={`text-xs ${
            status === "error"
              ? isDark
                ? "text-amber-300"
                : "text-red-700"
              : isDark
                ? "text-stone-400"
                : "text-muted"
          } ${isDark ? "" : "break-all"}`}
        >
          {message}
        </p>
      )}
    </div>
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
    propertyRooms,
    setPropertyRooms,
    sterr,
    setSterr,
    nbParking,
    setNbParking,
    nbCave,
    setNbCave,
    dpeMedian,
    setDpeMedian,
    anneeConstruction,
    setAnneeConstruction,
    hasBalcony,
    setHasBalcony,
    hasGarden,
    setHasGarden,
    hasPool,
    setHasPool,
    hasElevator,
    setHasElevator,
    unpopularTower,
    setUnpopularTower,
    conditionRatings,
    setConditionRatings,
    buildingStoreys,
    setBuildingStoreys,
    apartmentFloorNumber,
    setApartmentFloorNumber,
    result,
    setResult,
    adjustedPrice,
    setAdjustedPrice,
    workLines,
    setWorkLines,
    showWorksSection,
    setShowWorksSection,
    worksPaidInCash,
    setWorksPaidInCash,
    showOwnershipSection,
    setShowOwnershipSection,
    showLoanSection,
    setShowLoanSection,
    showLivingBudgetSection,
    setShowLivingBudgetSection,
    showInvestmentSection,
    setShowInvestmentSection,
    showSavingsSection,
    setShowSavingsSection,
    showVerdictSection,
    setShowVerdictSection,
    investmentTaxRegime,
    setInvestmentTaxRegime,
    investmentMarginalTaxRate,
    setInvestmentMarginalTaxRate,
    investmentOccupancyRate,
    setInvestmentOccupancyRate,
    loanDownPayment,
    setLoanDownPayment,
    loanDurationYears,
    setLoanDurationYears,
    loanInterestRate,
    setLoanInterestRate,
    loanInsuranceRate,
    setLoanInsuranceRate,
    loanRent,
    setLoanRent,
    loanAnnualCharges,
    setLoanAnnualCharges,
    exceptionalChargesEnabled,
    setExceptionalChargesEnabled,
    exceptionalChargesPct,
    setExceptionalChargesPct,
    maintenanceEnabled,
    setMaintenanceEnabled,
    maintenancePct,
    setMaintenancePct,
    loanPropertyTax,
    setLoanPropertyTax,
    loanNetSalary,
    setLoanNetSalary,
    savingsRate,
    setSavingsRate,
    savingsInflation,
    setSavingsInflation,
    propertyAppreciation,
    setPropertyAppreciation,
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
    getShareSnapshot,
  } = useEstimateSession();
  const [loading, setLoading] = useState(false);
  const [shareStatus, setShareStatus] = useState<
    "idle" | "loading" | "copied" | "error"
  >("idle");
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [formExpanded, setFormExpanded] = useState(() => !result);
  const resultRef = useRef<HTMLElement>(null);
  const formSectionRef = useRef<HTMLElement>(null);

  function handleExpandForm() {
    setFormExpanded(true);
    requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /** Clear result + form + finance so the user can start a new simulation. */
  function handleNewSimulation() {
    setResult(null);
    setAdjustedPrice(null);
    setModelInputSnapshot(null);
    setError(null);
    setShareStatus("idle");
    setShareMessage(null);
    setAddress("");
    setSbati("");
    setPropertyRooms("");
    setSterr("");
    setNbParking("");
    setNbCave("");
    setDpeMedian("");
    setAnneeConstruction("");
    setHasBalcony(false);
    setHasGarden(false);
    setHasPool(false);
    setHasElevator(false);
    setUnpopularTower(false);
    setConditionRatings(createEmptyConditionRatings());
    setBuildingStoreys("");
    setApartmentFloorNumber("");
    setPropertyType("APARTMENT");
    resetFinanceSectionToggles();
    resetAllFinanceDefaults();
    setAgencyFeeMode("percent");
    setAgencyFeeRate(DEFAULT_AGENCY_FEE_RATE);
    setAgencyFeeFixed(0);
    setNotaryPropertyAge("OLD");
    setNotaryFeeRate(DEFAULT_NOTARY_FEE_RATE);
    setFormExpanded(true);
    requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  async function handleShareScenario() {
    const snapshot = getShareSnapshot();
    if (!snapshot?.result) {
      return;
    }

    setShareStatus("loading");
    setShareMessage(null);
    try {
      const created = await createShareScenario({
        v: SHARE_PAYLOAD_VERSION,
        ...snapshot,
        result: snapshot.result,
      });
      const url = `${window.location.origin}${created.url_path}`;
      try {
        await navigator.clipboard.writeText(url);
        setShareStatus("copied");
        setShareMessage(t("share.copied"));
      } catch {
        setShareStatus("copied");
        setShareMessage(url);
      }
      window.setTimeout(() => {
        setShareStatus("idle");
        setShareMessage(null);
      }, 4000);
    } catch (err) {
      setShareStatus("error");
      setShareMessage(
        err instanceof Error ? err.message : t("share.error"),
      );
    }
  }

  useEffect(() => {
    if (result && !formExpanded) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result, formExpanded]);

  useEffect(() => {
    if (!showOwnershipSection && !showLoanSection) {
      setShowLivingBudgetSection(false);
      setLoanNetSalary(DEFAULT_NET_SALARY);
    }
  }, [
    showOwnershipSection,
    showLoanSection,
    setShowLivingBudgetSection,
    setLoanNetSalary,
  ]);

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

  function resetWorksDefaults() {
    setWorkLines([]);
    setWorksPaidInCash(false);
  }

  function resetOwnershipDefaults() {
    setLoanAnnualCharges(DEFAULT_ANNUAL_CHARGES);
    setExceptionalChargesEnabled(false);
    setExceptionalChargesPct(DEFAULT_EXCEPTIONAL_CHARGES_PCT);
    setMaintenanceEnabled(false);
    setMaintenancePct(DEFAULT_MAINTENANCE_PCT);
    setLoanPropertyTax(DEFAULT_PROPERTY_TAX);
  }

  function resetLoanCreditDefaults() {
    setLoanDownPayment(DEFAULT_LOAN_DOWN_PAYMENT);
    setLoanDurationYears(DEFAULT_LOAN_DURATION_YEARS);
    setLoanInterestRate(DEFAULT_LOAN_INTEREST_RATE);
    setLoanInsuranceRate(DEFAULT_LOAN_INSURANCE_RATE);
  }

  function resetLivingBudgetDefaults() {
    setLoanNetSalary(DEFAULT_NET_SALARY);
  }

  function resetSavingsDefaults() {
    setSavingsRate(DEFAULT_SAVINGS_RATE);
    setSavingsInflation(DEFAULT_INFLATION_RATE);
  }

  function resetVerdictDefaults() {
    setPropertyAppreciation(DEFAULT_PROPERTY_APPRECIATION);
  }

  function resetInvestmentTaxDefaults() {
    setInvestmentTaxRegime(DEFAULT_RENTAL_TAX_REGIME);
    setInvestmentMarginalTaxRate(DEFAULT_MARGINAL_TAX_RATE);
    setInvestmentOccupancyRate(DEFAULT_OCCUPANCY_RATE);
  }

  /** Full reset used on new estimate / property-type change. */
  function resetLoanDefaults() {
    resetLoanCreditDefaults();
    resetOwnershipDefaults();
    resetLivingBudgetDefaults();
    setLoanRent(null);
  }

  function resetAllFinanceDefaults() {
    resetWorksDefaults();
    resetLoanDefaults();
    resetInvestmentTaxDefaults();
    resetSavingsDefaults();
    resetVerdictDefaults();
  }

  function resetFinanceSectionToggles() {
    setShowWorksSection(false);
    setShowOwnershipSection(false);
    setShowLoanSection(false);
    setShowLivingBudgetSection(false);
    setShowInvestmentSection(false);
    setShowSavingsSection(false);
    setShowVerdictSection(false);
  }

  function handleWorksToggle(next: boolean) {
    setShowWorksSection(next);
    if (!next) {
      resetWorksDefaults();
    }
  }

  function handleOwnershipToggle(next: boolean) {
    setShowOwnershipSection(next);
    if (!next) {
      resetOwnershipDefaults();
    }
  }

  function handleLoanToggle(next: boolean) {
    setShowLoanSection(next);
    if (!next) {
      resetLoanCreditDefaults();
    }
  }

  function handleLivingBudgetToggle(next: boolean) {
    setShowLivingBudgetSection(next);
    if (!next) {
      resetLivingBudgetDefaults();
    }
  }

  function handleInvestmentToggle(next: boolean) {
    setShowInvestmentSection(next);
    if (!next) {
      resetInvestmentTaxDefaults();
      if (!showSavingsSection && !showVerdictSection) {
        setLoanRent(null);
      }
    }
  }

  function handleSavingsToggle(next: boolean) {
    setShowSavingsSection(next);
    if (!next) {
      resetSavingsDefaults();
      if (!showInvestmentSection && !showVerdictSection) {
        setLoanRent(null);
      }
    }
  }

  function handleVerdictToggle(next: boolean) {
    setShowVerdictSection(next);
    if (!next) {
      resetVerdictDefaults();
      if (!showInvestmentSection && !showSavingsSection) {
        setLoanRent(null);
      }
    }
  }

  function handlePropertyTypeChange(next: PropertyType) {
    setPropertyType(next);
    setResult(null);
    setAdjustedPrice(null);
    setHasBalcony(false);
    setHasGarden(false);
    setHasPool(false);
    setHasElevator(false);
    setUnpopularTower(false);
    setConditionRatings(createEmptyConditionRatings());
    setBuildingStoreys("");
    setApartmentFloorNumber("");
    setPropertyRooms("");
    setSterr("");
    resetFinanceSectionToggles();
    resetAllFinanceDefaults();
    setModelInputSnapshot(null);
    setError(null);
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setAdjustedPrice(null);
    resetFinanceSectionToggles();
    resetAllFinanceDefaults();
    setModelInputSnapshot(null);

    const endpoint =
      propertyType === "APARTMENT"
        ? "/api/predict/apartment"
        : "/api/predict/house";

    const body = {
      property_type: propertyType,
      address: address.trim(),
      sbati: Number(sbati),
      property_rooms: Number(propertyRooms),
      sterr:
        propertyType === "HOUSE" || sterr.trim() !== ""
          ? Number(sterr)
          : null,
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
      const parsedFloor =
        apartmentFloorNumber.trim() === ""
          ? null
          : Math.round(Number(apartmentFloorNumber));
      const parsedStoreys =
        buildingStoreys.trim() === ""
          ? null
          : Math.round(Number(buildingStoreys));
      const floorReady =
        parsedFloor != null &&
        parsedStoreys != null &&
        Number.isFinite(parsedFloor) &&
        Number.isFinite(parsedStoreys) &&
        parsedStoreys >= 1 &&
        parsedFloor >= 0 &&
        parsedFloor <= parsedStoreys;
      const upliftedPrice = applyMarketAdjustments(
        data.price,
        data.price_low,
        data.price_high,
        propertyType,
        {
          balcony: hasBalcony,
          garden: hasGarden,
          pool: hasPool,
          floor: floorReady ? parsedFloor : null,
          buildingStoreys: floorReady ? parsedStoreys : null,
          hasElevator,
          unpopularTower,
          conditionRatings,
        },
      );
      const adjustedResult: PredictResult = {
        ...data,
        price: upliftedPrice,
      };
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
        propertyRooms: Number(propertyRooms),
        sterr:
          propertyType === "HOUSE" || sterr.trim() !== ""
            ? Number(sterr)
            : null,
        nbParking: Number(nbParking),
        nbCave: Number(nbCave),
        dpeMedian: Number(dpeMedian),
        anneeConstruction: Number(anneeConstruction),
        hasBalcony,
        hasGarden,
        hasPool,
        hasElevator,
        unpopularTower,
        conditionRatings,
        buildingStoreys: floorReady ? parsedStoreys : null,
        apartmentFloorNumber: floorReady ? parsedFloor : null,
      });
      setResult(adjustedResult);
      setAdjustedPrice(Math.round(upliftedPrice));
      setWorkLines([createEmptyWorkLine()]);
      setFormExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.unknown"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className={`px-5 py-10 sm:px-8 sm:py-12 ${
        result && !formExpanded ? "pb-28" : ""
      }`}
    >
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
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-stone-700 pb-4">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-stone-400">
                  {t("share.resultLabel")}
                </p>
                <ShareScenarioControls
                  variant="dark"
                  status={shareStatus}
                  message={shareMessage}
                  onShare={() => void handleShareScenario()}
                  buttonLabel={t("share.button")}
                  creatingLabel={t("share.creating")}
                  copiedLabel={t("share.copiedShort")}
                />
              </div>
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
                        <dt className="text-stone-400">{t("form.rooms")} :</dt>
                        <dd className="font-medium text-white">
                          {modelInputSnapshot.propertyRooms >= 6
                            ? t("form.roomsSixPlus")
                            : t("form.roomsCount", {
                                count: modelInputSnapshot.propertyRooms,
                              })}
                        </dd>
                      </div>
                      {modelInputSnapshot.sterr != null &&
                        modelInputSnapshot.sterr > 0 && (
                          <div className="flex flex-wrap gap-x-2">
                            <dt className="text-stone-400">
                              {t("form.landArea")} :
                            </dt>
                            <dd className="font-medium text-white">
                              {new Intl.NumberFormat(intlLocale, {
                                maximumFractionDigits: 0,
                              }).format(modelInputSnapshot.sterr)}{" "}
                              m²
                            </dd>
                          </div>
                        )}
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
                      {(modelInputSnapshot.hasBalcony ||
                        modelInputSnapshot.hasGarden ||
                        modelInputSnapshot.hasPool ||
                        modelInputSnapshot.unpopularTower) && (
                        <div className="flex flex-wrap gap-x-2">
                          <dt className="text-stone-400">
                            {t("form.amenities")} :
                          </dt>
                          <dd className="font-medium text-white">
                            {[
                              modelInputSnapshot.hasBalcony
                                ? t("form.balcony")
                                : null,
                              modelInputSnapshot.hasGarden
                                ? t("form.garden")
                                : null,
                              modelInputSnapshot.hasPool ? t("form.pool") : null,
                              modelInputSnapshot.unpopularTower
                                ? t("form.unpopularTower")
                                : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </dd>
                        </div>
                      )}
                      {modelInputSnapshot.conditionRatings &&
                        hasAnyConditionRating(
                          modelInputSnapshot.conditionRatings,
                        ) && (
                        <div className="flex flex-wrap gap-x-2">
                          <dt className="text-stone-400">
                            {t("form.condition")} :
                          </dt>
                          <dd className="font-medium text-white">
                            {(() => {
                              const score = computeOverallConditionScore(
                                modelInputSnapshot.conditionRatings,
                              );
                              if (score == null) {
                                return null;
                              }
                              const pct = conditionScoreToAdjustmentPct(score);
                              const pctLabel = new Intl.NumberFormat(intlLocale, {
                                style: "percent",
                                maximumFractionDigits: 1,
                                signDisplay: "exceptZero",
                              }).format(pct);
                              return t("form.conditionSummary", {
                                score: score.toFixed(1),
                                adjustment: pctLabel,
                              });
                            })()}
                          </dd>
                        </div>
                      )}
                      {modelInputSnapshot.propertyType === "APARTMENT" &&
                        modelInputSnapshot.buildingStoreys != null &&
                        modelInputSnapshot.apartmentFloorNumber != null && (
                          <div className="flex flex-wrap gap-x-2">
                            <dt className="text-stone-400">
                              {t("form.floorElevator")} :
                            </dt>
                            <dd className="font-medium text-white">
                              {modelInputSnapshot.apartmentFloorNumber === 0
                                ? t("form.floorGround")
                                : modelInputSnapshot.apartmentFloorNumber === 1
                                  ? t("form.floorFirst")
                                  : t("form.floorNumberLabel", {
                                      floor:
                                        modelInputSnapshot.apartmentFloorNumber,
                                    })}
                              {" · "}
                              {t("form.buildingStoreysLabel", {
                                storeys: modelInputSnapshot.buildingStoreys,
                              })}
                              {" · "}
                              {modelInputSnapshot.hasElevator
                                ? t("form.elevatorYes")
                                : t("form.elevatorNo")}
                            </dd>
                          </div>
                        )}
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
                      <OptionalNumberInput
                        min={0}
                        step={100}
                        value={agencyFeeFixed}
                        onValueChange={setAgencyFeeFixed}
                        emptyValue={0}
                        blankWhenEmptyValue
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
              <p className="text-sm text-muted">
                {t("form.collapsedSummary", {
                  summary: `${modelPropertyTypeLabel(
                    modelInputSnapshot?.propertyType ?? propertyType,
                  )} · ${result.geocoded_address}`,
                })}
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {result && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="rounded-lg border border-border bg-stone-50 px-3 py-2 text-sm text-muted sm:flex-1">
                      {t("form.editHint")}
                    </p>
                    <button
                      type="button"
                      onClick={handleNewSimulation}
                      className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-stone-400 hover:bg-stone-50"
                    >
                      {t("form.newSimulation")}
                    </button>
                  </div>
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
                      {t("form.rooms")}
                      <FieldHint text={t("form.roomsHint")} />
                    </span>
                    <select
                      value={propertyRooms}
                      onChange={(e) => setPropertyRooms(e.target.value)}
                      required
                      className={inputClassName}
                    >
                      <option value="" disabled>
                        {t("form.dpeSelect")}
                      </option>
                      {ROOM_COUNT_OPTIONS.map((count) => (
                        <option key={count} value={count}>
                          {count >= 6
                            ? t("form.roomsSixPlus")
                            : t("form.roomsCount", { count })}
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
                      {t("form.landArea")}
                      <FieldHint
                        text={
                          propertyType === "HOUSE"
                            ? t("form.landAreaHintHouse")
                            : t("form.landAreaHintApartment")
                        }
                      />
                    </span>
                    <input
                      type="number"
                      value={sterr}
                      onChange={(e) => setSterr(e.target.value)}
                      min={propertyType === "HOUSE" ? 1 : 0}
                      max={propertyType === "HOUSE" ? 50000 : 5000}
                      step={1}
                      required={propertyType === "HOUSE"}
                      placeholder={
                        propertyType === "APARTMENT"
                          ? t("form.landAreaPlaceholderApartment")
                          : undefined
                      }
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

                <fieldset className="space-y-3">
                  <legend className={`${labelClassName} flex items-center gap-1.5 normal-case`}>
                    {t("form.amenities")}
                    <FieldHint
                      text={
                        propertyType === "HOUSE"
                          ? t("form.amenitiesHintHouse")
                          : t("form.amenitiesHintApartment")
                      }
                    />
                  </legend>
                  <div
                    className={`grid gap-3 ${
                      isBalconyApplicable(propertyType)
                        ? "sm:grid-cols-3"
                        : "sm:grid-cols-2"
                    }`}
                  >
                    {isBalconyApplicable(propertyType) && (
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={hasBalcony}
                          onChange={(e) => setHasBalcony(e.target.checked)}
                          className="h-4 w-4 rounded border-border"
                        />
                        {t("form.balcony")}
                      </label>
                    )}
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={hasGarden}
                        onChange={(e) => setHasGarden(e.target.checked)}
                        className="h-4 w-4 rounded border-border"
                      />
                      {t("form.garden")}
                    </label>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={hasPool}
                        onChange={(e) => setHasPool(e.target.checked)}
                        className="h-4 w-4 rounded border-border"
                      />
                      {t("form.pool")}
                    </label>
                  </div>
                </fieldset>

                <fieldset className="space-y-3">
                  <legend
                    className={`${labelClassName} flex items-center gap-1.5 normal-case`}
                  >
                    {t("form.condition")}
                    <FieldHint text={t("form.conditionHint")} />
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {CONDITION_POSTS.map((post) => (
                      <label key={post} className="flex flex-col gap-1.5">
                        <span className="text-sm text-foreground">
                          {t(`form.conditionPosts.${post}`)}
                        </span>
                        <select
                          value={
                            conditionRatings[post] == null
                              ? ""
                              : String(conditionRatings[post])
                          }
                          onChange={(e) => {
                            const next = parseConditionRating(e.target.value);
                            setConditionRatings((prev) => ({
                              ...prev,
                              [post]: next,
                            }));
                          }}
                          className={inputClassName}
                        >
                          <option value="">
                            {t("form.conditionNotRated")}
                          </option>
                          {CONDITION_RATING_OPTIONS.map((rating) => (
                            <option key={rating} value={rating}>
                              {rating} — {t(`form.conditionLevels.${rating}`)}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  {hasAnyConditionRating(conditionRatings) && (
                    <p className="text-xs text-muted">
                      {(() => {
                        const score =
                          computeOverallConditionScore(conditionRatings);
                        if (score == null) {
                          return null;
                        }
                        const pct = conditionScoreToAdjustmentPct(score);
                        const pctLabel = new Intl.NumberFormat(undefined, {
                          style: "percent",
                          maximumFractionDigits: 1,
                          signDisplay: "exceptZero",
                        }).format(pct);
                        return t("form.conditionLiveSummary", {
                          score: score.toFixed(1),
                          adjustment: pctLabel,
                        });
                      })()}
                    </p>
                  )}
                </fieldset>

                {isFloorAdjustmentApplicable(propertyType) && (
                  <fieldset className="space-y-3">
                    <legend
                      className={`${labelClassName} flex items-center gap-1.5 normal-case`}
                    >
                      {t("form.floorElevator")}
                      <FieldHint text={t("form.floorElevatorHint")} />
                    </legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="flex flex-col gap-2">
                        <span className={labelClassName}>
                          {t("form.buildingStoreys")}
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          step={1}
                          value={buildingStoreys}
                          onChange={(e) => setBuildingStoreys(e.target.value)}
                          placeholder={t("form.buildingStoreysPlaceholder")}
                          className={inputClassName}
                        />
                      </label>
                      <label className="flex flex-col gap-2">
                        <span className={labelClassName}>
                          {t("form.apartmentFloorNumber")}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={apartmentFloorNumber}
                          onChange={(e) =>
                            setApartmentFloorNumber(e.target.value)
                          }
                          placeholder={t("form.apartmentFloorPlaceholder")}
                          className={inputClassName}
                        />
                      </label>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={hasElevator}
                        onChange={(e) => setHasElevator(e.target.checked)}
                        className="h-4 w-4 rounded border-border"
                      />
                      {t("form.elevator")}
                    </label>
                    {isUnpopularTowerApplicable(propertyType) && (
                      <label className="flex items-start gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={unpopularTower}
                          onChange={(e) =>
                            setUnpopularTower(e.target.checked)
                          }
                          className="mt-0.5 h-4 w-4 rounded border-border"
                        />
                        <span>
                          <span className="font-medium">
                            {t("form.unpopularTower")}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">
                            {t("form.unpopularTowerHint")}
                          </span>
                        </span>
                      </label>
                    )}
                    <p className="text-xs text-muted">
                      {t("form.floorElevatorExample")}
                    </p>
                  </fieldset>
                )}

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


          {result && (
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
              <FinanceSectionToggle
                title={t("result.worksToggleTitle")}
                hint={t("result.worksToggleHint")}
                checked={showWorksSection}
                onCheckedChange={handleWorksToggle}
              />
              {showWorksSection && (() => {
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
              <div className="mt-5 border-t border-border pt-5">
                <p className="text-sm text-muted">{t("result.worksHint")}</p>

                <label className="mt-4 flex items-start gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={worksPaidInCash}
                    onChange={(e) => setWorksPaidInCash(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border"
                  />
                  <span>
                    <span className="font-medium">{t("result.worksPaidInCash")}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {worksPaidInCash
                        ? t("result.worksPaidInCashHintYes")
                        : t("result.worksPaidInCashHintNo")}
                    </span>
                  </span>
                </label>

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
                        <OptionalNumberInput
                          min={0}
                          step={100}
                          integer
                          value={line.amount}
                          onValueChange={(amount) =>
                            updateWorkLine(line.id, { amount })
                          }
                          emptyValue={0}
                          blankWhenEmptyValue
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
              </div>
            );
              })()}
            </section>
          )}

          {result && (
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
              <FinanceSectionToggle
                title={t("result.ownershipToggleTitle")}
                hint={t("result.ownershipToggleHint")}
                checked={showOwnershipSection}
                onCheckedChange={handleOwnershipToggle}
              />
              {showOwnershipSection && (() => {
                const displayPrice = adjustedPrice ?? Math.round(result.price);
                const annualChargesEff = effectiveAnnualCharges(
                  loanAnnualCharges,
                  exceptionalChargesEnabled,
                  exceptionalChargesPct,
                );
                const maintenanceAnnual = annualMaintenanceBudget(
                  displayPrice,
                  maintenanceEnabled,
                  maintenancePct,
                );
                const ownershipAnnualTotal = Math.round(
                  annualChargesEff + loanPropertyTax + maintenanceAnnual,
                );
                const ownershipMonthlyTotal = Math.round(
                  monthlyOwnershipCosts(
                    annualChargesEff,
                    loanPropertyTax,
                    maintenanceAnnual,
                  ),
                );
                return (
                <div className="mt-5 border-t border-border pt-5">
                  <p className="text-sm text-muted">
                    {t("result.loanOwnershipHint")}
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <span className={labelClassName}>
                        {t("result.loanAnnualCharges")}
                      </span>
                      <OptionalNumberInput
                        min={0}
                        step={100}
                        integer
                        value={loanAnnualCharges}
                        onValueChange={setLoanAnnualCharges}
                        emptyValue={0}
                        blankWhenEmptyValue
                        className={inputClassName}
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className={labelClassName}>
                        {t("result.loanPropertyTax")}
                      </span>
                      <OptionalNumberInput
                        min={0}
                        step={100}
                        integer
                        value={loanPropertyTax}
                        onValueChange={setLoanPropertyTax}
                        emptyValue={0}
                        blankWhenEmptyValue
                        className={inputClassName}
                      />
                    </label>
                  </div>

                  <div className="mt-4 rounded-lg border border-border bg-stone-50 px-4 py-3">
                    <FinanceSectionToggle
                      title={t("result.exceptionalChargesTitle")}
                      hint={t("result.exceptionalChargesHint")}
                      checked={exceptionalChargesEnabled}
                      onCheckedChange={setExceptionalChargesEnabled}
                    />
                    {exceptionalChargesEnabled && (
                      <div className="mt-3 grid gap-4 border-t border-border pt-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-2">
                          <span className={labelClassName}>
                            {t("result.exceptionalChargesPct")}
                          </span>
                          <OptionalNumberInput
                            min={0}
                            max={100}
                            step={1}
                            integer
                            value={exceptionalChargesPct}
                            onValueChange={setExceptionalChargesPct}
                            emptyValue={DEFAULT_EXCEPTIONAL_CHARGES_PCT}
                            className={inputClassName}
                          />
                        </label>
                        <div>
                          <p className={labelClassName}>
                            {t("result.exceptionalChargesAmount")}
                          </p>
                          <p className="mt-2 text-sm font-medium text-foreground">
                            {formatPrice(
                              Math.round(
                                (loanAnnualCharges *
                                  Math.max(0, exceptionalChargesPct)) /
                                  100,
                              ),
                            )}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {t("result.exceptionalChargesAmountNote", {
                              total: formatPrice(
                                Math.round(
                                  effectiveAnnualCharges(
                                    loanAnnualCharges,
                                    true,
                                    exceptionalChargesPct,
                                  ),
                                ),
                              ),
                            })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-lg border border-border bg-stone-50 px-4 py-3">
                    <FinanceSectionToggle
                      title={t("result.maintenanceTitle")}
                      hint={t("result.maintenanceHint")}
                      checked={maintenanceEnabled}
                      onCheckedChange={setMaintenanceEnabled}
                    />
                    {maintenanceEnabled && (
                      <div className="mt-3 grid gap-4 border-t border-border pt-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-2">
                          <span className={labelClassName}>
                            {t("result.maintenancePct")}
                          </span>
                          <OptionalNumberInput
                            min={0}
                            max={100}
                            step={0.1}
                            value={maintenancePct}
                            onValueChange={setMaintenancePct}
                            emptyValue={DEFAULT_MAINTENANCE_PCT}
                            className={inputClassName}
                          />
                        </label>
                        <div>
                          <p className={labelClassName}>
                            {t("result.maintenanceAmount")}
                          </p>
                          <p className="mt-2 text-sm font-medium text-foreground">
                            {formatPrice(Math.round(maintenanceAnnual))}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {t("result.maintenanceAmountNote")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                        {t("result.ownershipAnnualTotal")}
                      </p>
                      <p className="mt-2 font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        {formatPrice(ownershipAnnualTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                        {t("result.ownershipMonthlyTotal")}
                      </p>
                      <p className="mt-2 font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        {formatPrice(ownershipMonthlyTotal)}
                      </p>
                    </div>
                    <p className="text-xs text-muted sm:col-span-2">
                      {t("result.ownershipTotalsHint")}
                    </p>
                  </div>
                </div>
                );
              })()}
            </section>
          )}

          {result && (
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
              <FinanceSectionToggle
                title={t("result.loanToggleTitle")}
                hint={t("result.loanToggleHint")}
                checked={showLoanSection}
                onCheckedChange={handleLoanToggle}
              />
              {showLoanSection && (() => {
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
            const purchaseCost = priceFai + notaryAmount;
            const projectBudget = purchaseCost + worksTotal;
            const principal = loanPrincipal(
              loanFinancingBase(purchaseCost, worksTotal, worksPaidInCash),
              loanDownPayment,
            );
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
            const annualChargesEff = effectiveAnnualCharges(
              loanAnnualCharges,
              exceptionalChargesEnabled,
              exceptionalChargesPct,
            );
            const maintenanceAnnual = annualMaintenanceBudget(
              displayPrice,
              maintenanceEnabled,
              maintenancePct,
            );
            const ownerMonthlyCost =
              monthly +
              monthlyOwnershipCosts(
                annualChargesEff,
                loanPropertyTax,
                maintenanceAnnual,
              );

            return (
              <div className="mt-5 border-t border-border pt-5">
                <p className="text-sm text-muted">{t("result.loanHint")}</p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className={labelClassName}>{t("result.loanDownPayment")}</span>
                    <OptionalNumberInput
                      min={0}
                      step={1000}
                      integer
                      value={loanDownPayment}
                      onValueChange={setLoanDownPayment}
                      emptyValue={0}
                      blankWhenEmptyValue
                      placeholder="0"
                      className={inputClassName}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className={labelClassName}>{t("result.loanDuration")}</span>
                    <OptionalNumberInput
                      min={1}
                      max={35}
                      step={1}
                      integer
                      value={loanDurationYears}
                      onValueChange={setLoanDurationYears}
                      emptyValue={DEFAULT_LOAN_DURATION_YEARS}
                      className={inputClassName}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className={labelClassName}>{t("result.loanInterestRate")}</span>
                    <OptionalNumberInput
                      min={0}
                      max={20}
                      step={0.05}
                      value={loanInterestRate}
                      onValueChange={setLoanInterestRate}
                      emptyValue={DEFAULT_LOAN_INTEREST_RATE}
                      className={inputClassName}
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className={labelClassName}>{t("result.loanInsuranceRate")}</span>
                    <OptionalNumberInput
                      min={0}
                      max={5}
                      step={0.01}
                      value={loanInsuranceRate}
                      onValueChange={setLoanInsuranceRate}
                      emptyValue={DEFAULT_LOAN_INSURANCE_RATE}
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
                  <div className="grid gap-4 sm:grid-cols-2">
                    <p>
                      <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                        {t("result.loanMonthly")}
                      </span>
                      <span className="mt-2 block font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        {formatPrice(Math.round(monthly))}
                      </span>
                      <span className="mt-1 block text-xs text-muted">
                        {t("result.loanMonthlyHint")}
                      </span>
                    </p>
                    <p>
                      <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                        {t("result.loanOwnerMonthly")}
                      </span>
                      {showOwnershipSection ? (
                        <>
                          <span className="mt-2 block font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                            {formatPrice(Math.round(ownerMonthlyCost))}
                          </span>
                          <span className="mt-1 block text-xs text-muted">
                            {t("result.loanOwnerMonthlyHint")}
                          </span>
                        </>
                      ) : (
                        <span className="mt-2 block text-sm text-muted">
                          {t("result.loanOwnerMonthlyMissing")}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
              })()}
            </section>
          )}

          {result && (
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
              <FinanceSectionToggle
                title={t("result.livingBudgetToggleTitle")}
                hint={t("result.livingBudgetToggleHint")}
                checked={showLivingBudgetSection}
                onCheckedChange={handleLivingBudgetToggle}
                disabled={!showOwnershipSection && !showLoanSection}
              />
              {!showOwnershipSection && !showLoanSection && (
                <p className="mt-3 text-sm text-muted">
                  {t("result.livingBudgetInactiveNote")}
                </p>
              )}
              {showLivingBudgetSection &&
                (showOwnershipSection || showLoanSection) &&
                (() => {
                const displayPrice = adjustedPrice ?? Math.round(result.price);
                const priceFai = priceWithAgencyFees(
                  displayPrice,
                  agencyFeeMode,
                  agencyFeeRate,
                  agencyFeeFixed,
                );
                const notaryAmount = notaryFeeAmount(displayPrice, notaryFeeRate);
                const purchaseCost = priceFai + notaryAmount;
                const worksTotal = workLines.reduce(
                  (sum, line) => sum + Math.max(0, line.amount),
                  0,
                );
                const principal = loanPrincipal(
                  loanFinancingBase(purchaseCost, worksTotal, worksPaidInCash),
                  loanDownPayment,
                );
                const loanMonthly = showLoanSection
                  ? monthlyTotalPayment(
                      principal,
                      loanInterestRate,
                      loanDurationYears,
                      loanInsuranceRate,
                    )
                  : 0;
                const annualChargesEff = effectiveAnnualCharges(
                  loanAnnualCharges,
                  exceptionalChargesEnabled,
                  exceptionalChargesPct,
                );
                const maintenanceAnnual = annualMaintenanceBudget(
                  displayPrice,
                  maintenanceEnabled,
                  maintenancePct,
                );
                const ownershipMonthly = showOwnershipSection
                  ? monthlyOwnershipCosts(
                      annualChargesEff,
                      loanPropertyTax,
                      maintenanceAnnual,
                    )
                  : 0;
                const totalMonthlyCost = loanMonthly + ownershipMonthly;
                const remainingBudget = loanNetSalary - totalMonthlyCost;
                const remainingBudgetPct =
                  loanNetSalary > 0
                    ? (remainingBudget / loanNetSalary) * 100
                    : null;
                const debtRatioPct =
                  showLoanSection && loanNetSalary > 0
                    ? (loanMonthly / loanNetSalary) * 100
                    : null;
                const overDebtLimit =
                  debtRatioPct !== null && debtRatioPct > MAX_DEBT_RATIO_PCT;

                return (
                  <div className="mt-5 border-t border-border pt-5">
                    <p className="text-sm text-muted">
                      {t("result.livingBudgetHint")}
                    </p>
                    <label className="mt-4 flex max-w-md flex-col gap-2">
                      <span className={labelClassName}>
                        {t("result.loanNetSalary")}
                      </span>
                      <OptionalNumberInput
                        min={0}
                        step={100}
                        integer
                        value={loanNetSalary}
                        onValueChange={setLoanNetSalary}
                        emptyValue={0}
                        blankWhenEmptyValue
                        className={inputClassName}
                      />
                      <span className="text-xs text-muted">
                        {t("result.loanNetSalaryHint")}
                      </span>
                    </label>

                    {showLoanSection && (
                      <div className="mt-5 border-t border-border pt-5">
                        <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                          {t("result.loanDebtRatioTitle")}
                        </p>
                        <p
                          className={`mt-2 font-sans text-2xl font-semibold tracking-tight sm:text-3xl ${
                            overDebtLimit ? "text-red-700" : "text-foreground"
                          }`}
                        >
                          {debtRatioPct !== null
                            ? `${formatFeeRate(debtRatioPct)} %`
                            : "—"}
                        </p>
                        {debtRatioPct !== null && (
                          <p
                            className={`mt-2 text-sm font-medium ${
                              overDebtLimit ? "text-red-700" : "text-foreground"
                            }`}
                          >
                            {t("result.loanDebtRatio", {
                              pct: formatFeeRate(debtRatioPct),
                              maxPct: String(MAX_DEBT_RATIO_PCT),
                            })}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-muted">
                          {t("result.loanDebtRatioHint", {
                            monthly: formatPrice(Math.round(loanMonthly)),
                          })}
                        </p>
                      </div>
                    )}

                    <div className="mt-5 border-t border-border pt-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                            {t("result.livingBudgetReferenceCost")}
                          </p>
                          <p className="mt-2 font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                            {formatPrice(Math.round(totalMonthlyCost))}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {t("result.livingBudgetReferenceCostHint")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                            {t("result.loanRemainingBudget")}
                          </p>
                          <p className="mt-2 font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                            {loanNetSalary > 0
                              ? formatPrice(Math.round(remainingBudget))
                              : "—"}
                          </p>
                          {remainingBudgetPct !== null && (
                            <p className="mt-2 text-sm font-medium text-foreground">
                              {t("result.loanRemainingBudgetPct", {
                                pct: formatFeeRate(remainingBudgetPct),
                              })}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-muted">
                            {t("result.loanRemainingBudgetHint")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </section>
          )}

          {result && (
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
              <FinanceSectionToggle
                title={t("result.investmentToggleTitle")}
                hint={t("result.investmentToggleHint")}
                checked={showInvestmentSection}
                onCheckedChange={handleInvestmentToggle}
              />
              {showInvestmentSection &&
                (() => {
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
                  const notaryAmount = notaryFeeAmount(
                    displayPrice,
                    notaryFeeRate,
                  );
                  const purchaseCost = priceFai + notaryAmount;
                  const projectBudget = purchaseCost + worksTotal;
                  const rentMonthly =
                    loanRent ?? defaultMonthlyRent(displayPrice);
                  const effectiveRentMonthly = effectiveMonthlyRent(
                    rentMonthly,
                    investmentOccupancyRate,
                  );
                  const annualChargesEff = showOwnershipSection
                    ? effectiveAnnualCharges(
                        loanAnnualCharges,
                        exceptionalChargesEnabled,
                        exceptionalChargesPct,
                      )
                    : 0;
                  const maintenanceAnnual = showOwnershipSection
                    ? annualMaintenanceBudget(
                        displayPrice,
                        maintenanceEnabled,
                        maintenancePct,
                      )
                    : 0;
                  const propertyTaxAnnual = showOwnershipSection
                    ? loanPropertyTax
                    : 0;
                  const ownershipAnnual =
                    annualChargesEff + propertyTaxAnnual + maintenanceAnnual;
                  const ownershipMonthly = monthlyOwnershipCosts(
                    annualChargesEff,
                    propertyTaxAnnual,
                    maintenanceAnnual,
                  );
                  const buysCash = !showLoanSection;
                  const principal = buysCash
                    ? 0
                    : loanPrincipal(
                        loanFinancingBase(
                          purchaseCost,
                          worksTotal,
                          worksPaidInCash,
                        ),
                        loanDownPayment,
                      );
                  const loanMonthly = buysCash
                    ? 0
                    : monthlyTotalPayment(
                        principal,
                        loanInterestRate,
                        loanDurationYears,
                        loanInsuranceRate,
                      );
                  const equityInvested = buysCash
                    ? projectBudget
                    : cashEquityAtPurchase(
                        loanDownPayment,
                        worksTotal,
                        worksPaidInCash,
                      );
                  const grossYield = grossRentalYield(
                    effectiveRentMonthly,
                    projectBudget,
                  );
                  const netYield = netRentalYield(
                    effectiveRentMonthly,
                    ownershipAnnual,
                    projectBudget,
                  );
                  const cashFlow = monthlyInvestmentCashFlow(
                    effectiveRentMonthly,
                    loanMonthly,
                    ownershipMonthly,
                  );
                  const annualInterest = buysCash
                    ? 0
                    : annualLoanInterestFirstYear(
                        principal,
                        loanInterestRate,
                        loanDurationYears,
                      );
                  const tax = annualRentalIncomeTax({
                    monthlyRent: effectiveRentMonthly,
                    regime: investmentTaxRegime,
                    marginalTaxRatePct: investmentMarginalTaxRate,
                    annualOwnershipCosts: ownershipAnnual,
                    annualLoanInterest: annualInterest,
                  });
                  const netNetYield = netNetRentalYield(
                    effectiveRentMonthly,
                    ownershipAnnual,
                    tax.totalTax,
                    projectBudget,
                  );
                  const cashFlowAfterTax =
                    cashFlow - tax.totalTax / 12;
                  const cashOnCashAfterTax = cashOnCashReturn(
                    cashFlowAfterTax,
                    equityInvested,
                  );
                  const annualRentEffective = effectiveRentMonthly * 12;
                  const microCeilingExceeded =
                    investmentTaxRegime === "MICRO" &&
                    annualRentEffective > MICRO_FONCIER_GROSS_CEILING;

                  const investmentDpe = String(
                    modelInputSnapshot?.dpeMedian ?? dpeMedian ?? "",
                  );

                  return (
                    <div className="mt-5 border-t border-border pt-5">
                      <p className="text-sm text-muted">
                        {t("result.investmentHint")}
                      </p>

                      <div className="mt-4">
                        <DpeRentalAlert dpeValue={investmentDpe} />
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-2">
                          <span className={labelClassName}>
                            {t("result.investmentRent")}
                          </span>
                          <OptionalNumberInput
                            min={0}
                            step={50}
                            integer
                            value={rentMonthly}
                            onValueChange={setLoanRent}
                            emptyValue={defaultMonthlyRent(displayPrice)}
                            className={inputClassName}
                          />
                          <span className="text-xs text-muted">
                            {t("result.investmentRentNote")}
                          </span>
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className={labelClassName}>
                            {t("result.investmentOccupancy")}
                          </span>
                          <select
                            value={investmentOccupancyRate}
                            onChange={(e) =>
                              setInvestmentOccupancyRate(
                                Number(e.target.value) as OccupancyRate,
                              )
                            }
                            className={inputClassName}
                          >
                            {OCCUPANCY_RATE_OPTIONS.map((rate) => (
                              <option key={rate} value={rate}>
                                {rate} %
                              </option>
                            ))}
                          </select>
                          <span className="text-xs text-muted">
                            {t("result.investmentOccupancyHint", {
                              effective: formatPrice(
                                Math.round(effectiveRentMonthly),
                              ),
                            })}
                          </span>
                        </label>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                          {t("result.investmentAcquisition")}
                        </p>
                        <p className="mt-2 font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                          {formatPrice(Math.round(projectBudget))}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {t("result.investmentAcquisitionHint")}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-2">
                          <span className={labelClassName}>
                            {t("result.investmentTaxRegime")}
                          </span>
                          <select
                            value={investmentTaxRegime}
                            onChange={(e) =>
                              setInvestmentTaxRegime(
                                e.target.value as RentalTaxRegime,
                              )
                            }
                            className={inputClassName}
                          >
                            <option value="MICRO">
                              {t("result.investmentTaxRegimeMicro")}
                            </option>
                            <option value="REEL">
                              {t("result.investmentTaxRegimeReel")}
                            </option>
                          </select>
                          <span className="text-xs text-muted">
                            {investmentTaxRegime === "MICRO"
                              ? t("result.investmentTaxRegimeMicroHint")
                              : t("result.investmentTaxRegimeReelHint")}
                          </span>
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className={labelClassName}>
                            {t("result.investmentTaxBracket")}
                          </span>
                          <select
                            value={investmentMarginalTaxRate}
                            onChange={(e) =>
                              setInvestmentMarginalTaxRate(
                                Number(e.target.value) as MarginalTaxRate,
                              )
                            }
                            className={inputClassName}
                          >
                            {MARGINAL_TAX_RATES.map((rate) => (
                              <option key={rate} value={rate}>
                                {rate} %
                              </option>
                            ))}
                          </select>
                          <span className="text-xs text-muted">
                            {t("result.investmentTaxBracketHint", {
                              social: formatFeeRate(
                                RENTAL_SOCIAL_CONTRIBUTIONS_PCT,
                              ),
                            })}
                          </span>
                        </label>
                      </div>

                      {microCeilingExceeded && (
                        <p className="mt-3 text-sm text-red-700">
                          {t("result.investmentMicroCeilingWarning", {
                            ceiling: formatPrice(MICRO_FONCIER_GROSS_CEILING),
                          })}
                        </p>
                      )}

                      {!showOwnershipSection && (
                        <p className="mt-4 text-sm text-muted">
                          {t("result.investmentOwnershipNote")}
                        </p>
                      )}
                      {!showLoanSection && (
                        <p className="mt-2 text-sm text-muted">
                          {t("result.investmentLoanNote")}
                        </p>
                      )}

                      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                            {t("result.investmentGrossYield")}
                          </p>
                          <p className="mt-2 font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                            {grossYield !== null
                              ? `${formatFeeRate(grossYield)} %`
                              : "—"}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {t("result.investmentGrossYieldHint")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                            {t("result.investmentNetYield")}
                          </p>
                          <p className="mt-2 font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                            {netYield !== null
                              ? `${formatFeeRate(netYield)} %`
                              : "—"}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {t("result.investmentNetYieldHint")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                            {t("result.investmentNetNetYield")}
                          </p>
                          <p className="mt-2 font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                            {netNetYield !== null
                              ? `${formatFeeRate(netNetYield)} %`
                              : "—"}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {t("result.investmentNetNetYieldHint")}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                            {t("result.investmentAnnualTax")}
                          </p>
                          <p className="mt-2 font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                            {formatPrice(Math.round(tax.totalTax))}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {t("result.investmentAnnualTaxHint", {
                              income: formatPrice(Math.round(tax.incomeTax)),
                              social: formatPrice(
                                Math.round(tax.socialContributions),
                              ),
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                            {t("result.investmentCashFlow")}
                          </p>
                          <p
                            className={`mt-2 font-sans text-2xl font-semibold tracking-tight sm:text-3xl ${
                              cashFlow < 0 ? "text-red-700" : "text-foreground"
                            }`}
                          >
                            {formatPrice(Math.round(cashFlow))}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {t("result.investmentCashFlowHint")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                            {t("result.investmentCashFlowAfterTax")}
                          </p>
                          <p
                            className={`mt-2 font-sans text-2xl font-semibold tracking-tight sm:text-3xl ${
                              cashFlowAfterTax < 0
                                ? "text-red-700"
                                : "text-foreground"
                            }`}
                          >
                            {formatPrice(Math.round(cashFlowAfterTax))}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {t("result.investmentCashFlowAfterTaxHint")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                            {t("result.investmentCashOnCash")}
                          </p>
                          <p
                            className={`mt-2 font-sans text-2xl font-semibold tracking-tight sm:text-3xl ${
                              cashOnCashAfterTax !== null &&
                              cashOnCashAfterTax < 0
                                ? "text-red-700"
                                : "text-foreground"
                            }`}
                          >
                            {cashOnCashAfterTax !== null
                              ? `${formatFeeRate(cashOnCashAfterTax)} %`
                              : "—"}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {buysCash
                              ? t("result.investmentCashOnCashHintCash")
                              : worksTotal > 0 && worksPaidInCash
                                ? t("result.investmentCashOnCashHintWorks")
                                : t("result.investmentCashOnCashHint")}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-xs text-muted">
                        {t("result.investmentDisclaimer")}
                      </p>
                    </div>
                  );
                })()}
            </section>
          )}

          {result && (
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
              <FinanceSectionToggle
                title={t("result.savingsToggleTitle")}
                hint={t("result.savingsToggleHint")}
                checked={showSavingsSection}
                onCheckedChange={handleSavingsToggle}
              />
              {showSavingsSection && (() => {
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
            const purchaseCost = priceFai + notaryAmount;
            const projectBudget = purchaseCost + worksTotal;
            const buysCash = !showLoanSection;
            const principal = buysCash
              ? 0
              : loanPrincipal(
                  loanFinancingBase(purchaseCost, worksTotal, worksPaidInCash),
                  loanDownPayment,
                );
            const loanMonthly = buysCash
              ? 0
              : Math.round(
                  monthlyTotalPayment(
                    principal,
                    loanInterestRate,
                    loanDurationYears,
                    loanInsuranceRate,
                  ),
                );
            const rentMonthly = loanRent ?? defaultMonthlyRent(displayPrice);
            const annualChargesEff = effectiveAnnualCharges(
              loanAnnualCharges,
              exceptionalChargesEnabled,
              exceptionalChargesPct,
            );
            const maintenanceAnnual = annualMaintenanceBudget(
              displayPrice,
              maintenanceEnabled,
              maintenancePct,
            );
            const initialCapital = buysCash
              ? projectBudget
              : cashEquityAtPurchase(
                  loanDownPayment,
                  worksTotal,
                  worksPaidInCash,
                );
            const monthlyDeposit = Math.round(
              monthlyInvestableWhenRenting(
                loanMonthly,
                rentMonthly,
                annualChargesEff,
                loanPropertyTax,
                maintenanceAnnual,
              ),
            );
            const years = buysCash
              ? DEFAULT_CASH_SAVINGS_YEARS
              : Math.max(1, Math.round(loanDurationYears));
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
              <div className="mt-5 border-t border-border pt-5">
                <p className="text-sm text-muted">
                  {buysCash
                    ? t("result.savingsHintCash")
                    : t("result.savingsHint")}
                </p>

                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className={labelClassName}>{t("result.savingsInitial")}</p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {formatPrice(initialCapital)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {buysCash
                          ? worksTotal > 0
                            ? t("result.savingsInitialNoteCashWorks")
                            : t("result.savingsInitialNoteCash")
                          : worksTotal > 0 && worksPaidInCash
                            ? t("result.savingsInitialNoteWorks")
                            : t("result.savingsInitialNote")}
                      </p>
                    </div>
                    <div>
                      <p className={labelClassName}>{t("result.savingsMonthly")}</p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {formatPrice(monthlyDeposit)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {buysCash
                          ? t("result.savingsMonthlyNoteCash")
                          : t("result.savingsMonthlyNote")}
                      </p>
                    </div>
                    <div>
                      <p className={labelClassName}>{t("result.savingsYears")}</p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {years}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {buysCash
                          ? t("result.savingsYearsNoteCash")
                          : t("result.savingsYearsNote")}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="flex flex-col gap-2">
                      <span className={labelClassName}>{t("result.loanRent")}</span>
                      <OptionalNumberInput
                        min={0}
                        step={50}
                        integer
                        value={rentMonthly}
                        onValueChange={setLoanRent}
                        emptyValue={defaultMonthlyRent(displayPrice)}
                        className={inputClassName}
                      />
                      <span className="text-xs text-muted">
                        {t("result.loanRentNote")}
                      </span>
                    </label>
                    <div>
                      <p className={labelClassName}>
                        {t("result.loanAnnualCharges")}
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {formatPrice(annualChargesEff)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {exceptionalChargesEnabled
                          ? t("result.savingsChargesWithExceptional", {
                              pct: exceptionalChargesPct,
                            })
                          : t("result.savingsOwnershipEditNote")}
                      </p>
                    </div>
                    <div>
                      <p className={labelClassName}>
                        {t("result.loanPropertyTax")}
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {formatPrice(loanPropertyTax)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {t("result.savingsOwnershipEditNote")}
                      </p>
                    </div>
                    <div>
                      <p className={labelClassName}>
                        {t("result.maintenanceAmount")}
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {formatPrice(Math.round(maintenanceAnnual))}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {maintenanceEnabled
                          ? t("result.savingsMaintenanceNote", {
                              pct: maintenancePct,
                            })
                          : t("result.savingsOwnershipEditNote")}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <span className={labelClassName}>
                        {t("result.savingsRate")}
                      </span>
                      <OptionalNumberInput
                        min={0}
                        max={20}
                        step={0.1}
                        value={savingsRate}
                        onValueChange={setSavingsRate}
                        emptyValue={DEFAULT_SAVINGS_RATE}
                        className={inputClassName}
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className={labelClassName}>
                        {t("result.savingsInflation")}
                      </span>
                      <OptionalNumberInput
                        min={0}
                        max={15}
                        step={0.1}
                        value={savingsInflation}
                        onValueChange={setSavingsInflation}
                        emptyValue={DEFAULT_INFLATION_RATE}
                        className={inputClassName}
                      />
                    </label>
                  </div>
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
              </div>
            );
              })()}
            </section>
          )}

          {result && (
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
              <FinanceSectionToggle
                title={t("result.verdictToggleTitle")}
                hint={t("result.verdictToggleHint")}
                checked={showVerdictSection}
                onCheckedChange={handleVerdictToggle}
              />
              {showVerdictSection && (() => {
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
            const purchaseCost = priceFai + notaryAmount;
            const projectBudget = purchaseCost + worksTotal;
            const buysCash = !showLoanSection;
            const principal = buysCash
              ? 0
              : loanPrincipal(
                  loanFinancingBase(purchaseCost, worksTotal, worksPaidInCash),
                  loanDownPayment,
                );
            const years = buysCash
              ? DEFAULT_CASH_SAVINGS_YEARS
              : Math.max(1, Math.round(loanDurationYears));
            const loanMonthly = buysCash
              ? 0
              : Math.round(
                  monthlyTotalPayment(
                    principal,
                    loanInterestRate,
                    loanDurationYears,
                    loanInsuranceRate,
                  ),
                );
            const rentMonthly = loanRent ?? defaultMonthlyRent(displayPrice);
            const annualChargesEff = effectiveAnnualCharges(
              loanAnnualCharges,
              exceptionalChargesEnabled,
              exceptionalChargesPct,
            );
            const maintenanceAnnual = annualMaintenanceBudget(
              displayPrice,
              maintenanceEnabled,
              maintenancePct,
            );
            const initialCapital = buysCash
              ? projectBudget
              : cashEquityAtPurchase(
                  loanDownPayment,
                  worksTotal,
                  worksPaidInCash,
                );
            const monthlyDeposit = Math.round(
              monthlyInvestableWhenRenting(
                loanMonthly,
                rentMonthly,
                annualChargesEff,
                loanPropertyTax,
                maintenanceAnnual,
              ),
            );
            const rentWealth = savingsSnapshot(
              initialCapital,
              monthlyDeposit,
              savingsRate,
              years,
            ).futureValue;
            const buyPropertyWealth = buyNetWorth(
              displayPrice,
              propertyAppreciation,
              years,
              principal,
              loanInterestRate,
              buysCash ? years : loanDurationYears,
            );
            const ownershipMonthly = showOwnershipSection
              ? monthlyOwnershipCosts(
                  annualChargesEff,
                  loanPropertyTax,
                  maintenanceAnnual,
                )
              : 0;
            const rentSaved = rentSavedOverYears(
              rentMonthly,
              years,
              loanMonthly,
              ownershipMonthly,
            );
            const buyWealth = buyPropertyWealth + rentSaved;
            const gap = Math.abs(buyWealth - rentWealth);
            const preferBuy = buyWealth >= rentWealth;

            return (
              <div className="mt-5 border-t border-border pt-5">
                <p className="text-sm text-muted">
                  {buysCash
                    ? t("result.verdictHintCash")
                    : t("result.verdictHint")}
                </p>

                <label className="mt-4 flex max-w-xs flex-col gap-2">
                  <span className={labelClassName}>
                    {t("result.verdictAppreciation")}
                  </span>
                  <OptionalNumberInput
                    min={0}
                    max={15}
                    step={0.1}
                    value={propertyAppreciation}
                    onValueChange={setPropertyAppreciation}
                    emptyValue={DEFAULT_PROPERTY_APPRECIATION}
                    className={inputClassName}
                  />
                  <span className="text-xs text-muted">
                    {t("result.verdictAppreciationNote")}
                  </span>
                </label>

                <p className="mt-4 text-sm text-muted">
                  {t("result.verdictRentUsed", {
                    rent: formatPrice(rentMonthly),
                  })}
                </p>

                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                      {t("result.verdictBuy")}
                    </p>
                    <p className="mt-2 font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                      {formatPrice(Math.round(buyWealth))}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {t("result.verdictBuyBreakdown", {
                        property: formatPrice(Math.round(buyPropertyWealth)),
                        rentSaved: formatPrice(Math.round(rentSaved)),
                      })}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {t("result.verdictBuyHint")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
                      {t("result.verdictRent")}
                    </p>
                    <p className="mt-2 font-sans text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                      {formatPrice(Math.round(rentWealth))}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {t("result.verdictRentHint")}
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t border-border pt-5">
                  <p className="font-sans text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    {preferBuy
                      ? t("result.verdictPreferBuy", {
                          years: String(years),
                          gap: formatPrice(Math.round(gap)),
                        })
                      : t("result.verdictPreferRent", {
                          years: String(years),
                          gap: formatPrice(Math.round(gap)),
                        })}
                  </p>
                  <p className="mt-3 text-xs text-muted">{t("result.verdictDisclaimer")}</p>
                </div>
              </div>
            );
              })()}
            </section>
          )}

          {result && (
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t("share.bottomTitle")}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {t("share.bottomHint")}
                  </p>
                </div>
                <ShareScenarioControls
                  variant="light"
                  status={shareStatus}
                  message={shareMessage}
                  onShare={() => void handleShareScenario()}
                  buttonLabel={t("share.button")}
                  creatingLabel={t("share.creating")}
                  copiedLabel={t("share.copiedShort")}
                />
              </div>
            </section>
          )}

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

        {result && !formExpanded && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleExpandForm}
                className="rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground transition hover:border-stone-400 hover:bg-stone-50 sm:flex-1"
              >
                {t("form.expandForm")}
              </button>
              <button
                type="button"
                onClick={handleNewSimulation}
                className="rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition hover:bg-stone-800 sm:flex-1"
              >
                {t("form.newSimulation")}
              </button>
            </div>
          </div>
        )}
    </main>
  );
}
