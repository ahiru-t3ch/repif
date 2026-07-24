"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { DpeRentalAlert } from "@/components/DpeRentalAlert";
import {
  EstimateWizard,
  PropertyTypeChoice,
} from "@/components/EstimateWizard";
import { FieldHint } from "@/components/FieldHint";
import { OptionalNumberInput } from "@/components/OptionalNumberInput";
import {
  AGENCY_FEE_PERCENT,
  agencyFeeAmount,
  agencyFeeAmountFromRate,
  effectiveAgencyFeeRate,
  priceWithAgencyFees,
  type AgencyFeeMode,
} from "@/lib/agency-fees";
import { ShareScenarioControls } from "@/components/ShareScenarioControls";
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
  DEFAULT_SAVINGS_RATE,
  DEFAULT_INFLATION_RATE,
  createEmptyWorkLine,
  useEstimateSession,
  type ModelInputSnapshot,
  type PredictResult,
  type PropertyType,
} from "@/lib/estimate-session/context";
import {
  getEstimateWizardStepCount,
  validateEstimateWizardStep,
  type EstimateWizardErrorKey,
} from "@/lib/estimate-wizard-validation";
import {
  applyMarketAdjustments,
  apartmentHasGardenFromLandArea,
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
import {
  formatFeeRate as formatFeeRateDisplay,
  formatPrice as formatPriceDisplay,
  formatPricePerSqm as formatPricePerSqmDisplay,
} from "@/lib/format-display";
import { useI18n } from "@/lib/i18n/context";
import {
  getNotaryFeeRangeByAge,
  inferNotaryPropertyAge,
  notaryFeeAmount,
  type NotaryPropertyAge,
} from "@/lib/notary-fees";
import { useShareScenario } from "@/lib/use-share-scenario";
import {
  alertErrorClassName,
  btnPrimaryClassName,
  btnSecondaryClassName,
  btnSecondarySmClassName,
  cardDarkSectionClassName,
  darkInputClassName,
  inputClassName,
  labelClassName,
  linkUnderlineClassName,
  modeButtonActiveClassName,
  modeButtonInactiveClassName,
  rangeDarkClassName,
  sectionCardClassName,
} from "@/lib/ui-classes";

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

type ModelInputSummaryEntry = {
  key: string;
  label: string;
  value: string;
};

function buildModelInputSummaryEntries(
  snapshot: ModelInputSnapshot,
  t: (key: string, values?: Record<string, string | number>) => string,
  intlLocale: string,
  propertyTypeLabel: string,
): ModelInputSummaryEntry[] {
  const entries: ModelInputSummaryEntry[] = [
    {
      key: "propertyType",
      label: t("form.propertyType"),
      value: propertyTypeLabel,
    },
    {
      key: "surface",
      label: t("form.surface"),
      value: `${new Intl.NumberFormat(intlLocale, {
        maximumFractionDigits: 2,
      }).format(snapshot.sbati)} m²`,
    },
    {
      key: "rooms",
      label: t("form.rooms"),
      value:
        snapshot.propertyRooms >= 6
          ? t("form.roomsSixPlus")
          : t("form.roomsCount", { count: snapshot.propertyRooms }),
    },
  ];

  if (snapshot.sterr != null && snapshot.sterr > 0) {
    entries.push({
      key: "land",
      label: t("form.landArea"),
      value: `${new Intl.NumberFormat(intlLocale, {
        maximumFractionDigits: 0,
      }).format(snapshot.sterr)} m²`,
    });
  }

  entries.push(
    {
      key: "parking",
      label: t("form.parking"),
      value: String(snapshot.nbParking),
    },
    {
      key: "cave",
      label: t("form.cave"),
      value: String(snapshot.nbCave),
    },
  );

  if (snapshot.hasBalcony || snapshot.hasPool || snapshot.unpopularTower) {
    entries.push({
      key: "amenities",
      label: t("form.amenities"),
      value: [
        snapshot.hasBalcony ? t("form.balcony") : null,
        snapshot.hasPool ? t("form.pool") : null,
        snapshot.unpopularTower ? t("form.unpopularTower") : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  if (
    snapshot.conditionRatings &&
    hasAnyConditionRating(snapshot.conditionRatings)
  ) {
    const score = computeOverallConditionScore(snapshot.conditionRatings);
    if (score != null) {
      const pct = conditionScoreToAdjustmentPct(score);
      const pctLabel = new Intl.NumberFormat(intlLocale, {
        style: "percent",
        maximumFractionDigits: 1,
        signDisplay: "exceptZero",
      }).format(pct);
      entries.push({
        key: "condition",
        label: t("form.condition"),
        value: t("form.conditionSummary", {
          score: score.toFixed(1),
          adjustment: pctLabel,
        }),
      });
    }
  }

  if (
    snapshot.propertyType === "APARTMENT" &&
    snapshot.buildingStoreys != null &&
    snapshot.apartmentFloorNumber != null
  ) {
    const floorLabel =
      snapshot.apartmentFloorNumber === 0
        ? t("form.floorGround")
        : snapshot.apartmentFloorNumber === 1
          ? t("form.floorFirst")
          : t("form.floorNumberLabel", {
              floor: snapshot.apartmentFloorNumber,
            });
    entries.push({
      key: "floor",
      label: t("form.floorElevator"),
      value: `${floorLabel} · ${t("form.buildingStoreysLabel", {
        storeys: snapshot.buildingStoreys,
      })} · ${
        snapshot.hasElevator ? t("form.elevatorYes") : t("form.elevatorNo")
      }`,
    });
  }

  entries.push(
    {
      key: "dpe",
      label: t("form.dpe"),
      value:
        dpeValueToLetter(snapshot.dpeMedian) ?? String(snapshot.dpeMedian),
    },
    {
      key: "year",
      label: t("form.year"),
      value: String(snapshot.anneeConstruction),
    },
  );

  return entries;
}

function ModelInputSummaryList({
  entries,
}: {
  entries: ModelInputSummaryEntry[];
}) {
  return (
    <dl className="grid gap-1.5 text-sm leading-relaxed">
      {entries.map(({ key, label, value }) => (
        <div key={key} className="flex flex-wrap gap-x-2">
          <dt className="text-card-subtle">{label} :</dt>
          <dd className="font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
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
    setShowWorksSection,
    setShowOwnershipSection,
    setShowLoanSection,
    setShowLivingBudgetSection,
    setShowInvestmentSection,
    setShowSavingsSection,
    setShowVerdictSection,
    setInvestmentTaxRegime,
    setInvestmentMarginalTaxRate,
    setInvestmentOccupancyRate,
    setLoanDownPayment,
    setLoanDurationYears,
    setLoanInterestRate,
    setLoanInsuranceRate,
    setLoanRent,
    setLoanAnnualCharges,
    setExceptionalChargesEnabled,
    setExceptionalChargesPct,
    setMaintenanceEnabled,
    setMaintenancePct,
    setLoanPropertyTax,
    setLoanNetSalary,
    setSavingsRate,
    setSavingsInflation,
    setPropertyAppreciation,
    setWorksPaidInCash,
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
    setFinanceAnalysisComplete,
    error,
    setError,
  } = useEstimateSession();
  const { shareStatus, shareMessage, handleShareScenario } = useShareScenario();
  const [loading, setLoading] = useState(false);
  const [formExpanded, setFormExpanded] = useState(() => !result);
  const [wizardStep, setWizardStep] = useState(0);
  const [showModelInputs, setShowModelInputs] = useState(false);
  const [wizardErrorKey, setWizardErrorKey] =
    useState<EstimateWizardErrorKey | null>(null);
  const resultRef = useRef<HTMLElement>(null);
  const formSectionRef = useRef<HTMLElement>(null);

  const wizardStepLabels =
    propertyType === "APARTMENT"
      ? [
          t("form.wizardStep1Title"),
          t("form.wizardStep2Title"),
          t("form.wizardStep3Title"),
          t("form.wizardStep4Title"),
          t("form.wizardStep5Title"),
        ]
      : [
          t("form.wizardStep1Title"),
          t("form.wizardStep2Title"),
          t("form.wizardStep3Title"),
          t("form.wizardStep4Title"),
        ];
  const wizardStepHints = [
    t("form.wizardStep1Hint"),
    t("form.wizardStep2Hint"),
    t("form.wizardStep3Hint"),
    t("form.wizardStep4Hint"),
    t("form.wizardStep5Hint"),
  ];
  const wizardStepCount = getEstimateWizardStepCount(propertyType);

  useEffect(() => {
    if (wizardStep >= wizardStepCount) {
      setWizardStep(wizardStepCount - 1);
    }
  }, [wizardStep, wizardStepCount]);

  function getWizardFields() {
    return {
      propertyType,
      address,
      sbati,
      propertyRooms,
      sterr,
      nbParking,
      nbCave,
      dpeMedian,
      anneeConstruction,
    };
  }

  function goWizardNext() {
    const errorKey = validateEstimateWizardStep(wizardStep, getWizardFields());
    if (errorKey) {
      setWizardErrorKey(errorKey);
      formSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    setWizardErrorKey(null);
    setWizardStep((current) =>
      Math.min(current + 1, wizardStepCount - 1),
    );
  }

  function goWizardBack() {
    setWizardErrorKey(null);
    setWizardStep((current) => Math.max(current - 1, 0));
  }

  function handleExpandForm() {
    setFormExpanded(true);
    setWizardStep(0);
    setWizardErrorKey(null);
    requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /** Clear result + form + finance so the user can start a new simulation. */
  function handleNewSimulation() {
    setResult(null);
    setAdjustedPrice(null);
    setShowModelInputs(false);
    setFinanceAnalysisComplete(false);
    setModelInputSnapshot(null);
    setError(null);
    setAddress("");
    setSbati("");
    setPropertyRooms("");
    setSterr("");
    setNbParking("");
    setNbCave("");
    setDpeMedian("");
    setAnneeConstruction("");
    setHasBalcony(false);
    setHasPool(false);
    setHasElevator(false);
    setUnpopularTower(false);
    setConditionRatings(createEmptyConditionRatings());
    setBuildingStoreys("");
    setApartmentFloorNumber("");
    setPropertyType("APARTMENT");
    setWizardStep(0);
    setWizardErrorKey(null);
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

  useEffect(() => {
    if (result && !formExpanded) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result, formExpanded]);

  function formatScore(score: number) {
    return `${Math.round(score * 100)} %`;
  }

  function formatPrice(value: number) {
    return formatPriceDisplay(intlLocale, value);
  }

  function formatFeeRate(rate: number) {
    return formatFeeRateDisplay(intlLocale, rate);
  }

  function formatPricePerSqm(netPrice: number, surface: number) {
    return formatPricePerSqmDisplay(intlLocale, netPrice, surface);
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

  function handlePropertyTypeChange(next: PropertyType) {
    setPropertyType(next);
    setResult(null);
    setAdjustedPrice(null);
    setHasBalcony(false);
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
    setFinanceAnalysisComplete(false);
    setModelInputSnapshot(null);
    setError(null);
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    if (wizardStep < wizardStepCount - 1) {
      goWizardNext();
      return;
    }

    for (let step = 0; step < wizardStepCount - 1; step += 1) {
      const errorKey = validateEstimateWizardStep(step, getWizardFields());
      if (errorKey) {
        setWizardStep(step);
        setWizardErrorKey(errorKey);
        formSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }
    }

    setWizardErrorKey(null);
    setLoading(true);
    setError(null);
    setResult(null);
    setAdjustedPrice(null);
    setShowModelInputs(false);
    setFinanceAnalysisComplete(false);
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
      const parsedSterr =
        propertyType === "HOUSE" || sterr.trim() !== ""
          ? Number(sterr)
          : null;
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
          garden: apartmentHasGardenFromLandArea(propertyType, parsedSterr),
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
        sterr: parsedSterr,
        nbParking: Number(nbParking),
        nbCave: Number(nbCave),
        dpeMedian: Number(dpeMedian),
        anneeConstruction: Number(anneeConstruction),
        hasBalcony,
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
            const modelInputEntries = modelInputSnapshot
              ? buildModelInputSummaryEntries(
                  modelInputSnapshot,
                  t,
                  intlLocale,
                  modelPropertyTypeLabel(modelInputSnapshot.propertyType),
                )
              : [];
            const modelInputSplitAt = Math.ceil(modelInputEntries.length / 2);
            const modelInputLeftEntries = modelInputEntries.slice(
              0,
              modelInputSplitAt,
            );
            const modelInputRightEntries = modelInputEntries.slice(
              modelInputSplitAt,
            );

            return (
            <section
              ref={resultRef}
              className={`scroll-mt-24 ${cardDarkSectionClassName}`}
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-card-border pb-4">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-card-subtle">
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
              <div className="grid gap-6 border-b border-card-border pb-5 sm:grid-cols-2">
                <div className="min-w-0 space-y-2 text-sm leading-relaxed text-card-muted">
                  <p>
                    {t("result.geocodedAddress")}{" "}
                    <span className="font-medium text-primary">
                      {result.geocoded_address}
                    </span>
                  </p>
                  {result.input_address.trim().toLowerCase() !==
                    result.geocoded_address.trim().toLowerCase() && (
                    <p>
                      {t("result.inputAddress")}{" "}
                      <span className="font-medium text-primary">
                        {result.input_address}
                      </span>
                    </p>
                  )}
                  <p>
                    {t("result.matchScore")}{" "}
                    <span
                      className={`font-medium ${
                        result.geocode_score < 0.7
                          ? "text-warning"
                          : "text-primary"
                      }`}
                    >
                      {formatScore(result.geocode_score)}
                    </span>
                  </p>
                  {showModelInputs && modelInputLeftEntries.length > 0 && (
                    <div className="mt-5 space-y-2 border-t border-card-border pt-5">
                      <p className="text-xs font-medium uppercase tracking-wide text-card-subtle">
                        {t("result.modelInputTitle")}
                      </p>
                      <ModelInputSummaryList entries={modelInputLeftEntries} />
                    </div>
                  )}
                </div>

                {modelInputSnapshot && (
                  <div className="min-w-0 border-t border-card-border pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
                    <button
                      type="button"
                      onClick={() => setShowModelInputs((visible) => !visible)}
                      className="rounded-lg border border-card-input-border px-3 py-2 text-sm font-medium text-card-muted transition hover:border-card-subtle hover:bg-card-input"
                      aria-expanded={showModelInputs}
                    >
                      {showModelInputs
                        ? t("result.hideModelInputs")
                        : t("result.showModelInputs")}
                    </button>
                    {showModelInputs && modelInputRightEntries.length > 0 && (
                      <div className="mt-4">
                        <ModelInputSummaryList entries={modelInputRightEntries} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid gap-6 border-b border-card-border py-5 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-[0.15em] text-primary">
                    <span>
                      {resultTitle(modelInputSnapshot?.propertyType ?? propertyType)}
                    </span>
                    <span className="font-normal normal-case tracking-normal text-card-faint">
                      · {t("result.excludingAgencyFees")}
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-end gap-x-8 gap-y-3">
                    <div>
                      <p className="font-sans text-3xl font-semibold tracking-tight text-primary sm:text-4xl">
                        {formatPrice(displayPrice)}
                      </p>
                      {rangeHigh > rangeLow && (
                        <label className="mt-4 block">
                          <span className="text-xs text-card-subtle">
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
                            className={rangeDarkClassName}
                          />
                          <div className="mt-1 flex justify-between text-xs text-card-faint">
                            <span>{formatPrice(rangeLow)}</span>
                            <span>{formatPrice(rangeHigh)}</span>
                          </div>
                          {isAdjusted && (
                            <button
                              type="button"
                              onClick={() => setAdjustedPrice(modelPrice)}
                              className="mt-2 text-xs text-card-muted underline decoration-card-faint underline-offset-2 transition hover:text-primary"
                            >
                              {t("result.resetToModelPrice")}
                            </button>
                          )}
                        </label>
                      )}
                    </div>
                    {pricePerSqm && (
                      <div>
                        <p className="font-sans text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
                          {pricePerSqm}
                        </p>
                        <p className="mt-1 text-sm text-card-subtle">
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

                <div className="min-w-0 border-t border-card-border pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-card-subtle">
                    {t("result.includingAgencyFees")}
                  </p>
                  <p className="mt-2 font-sans text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
                    {formatPrice(priceFai)}
                  </p>
                  <p className="mt-2 text-sm text-card-muted">
                    {t("result.agencyFeesAmount")}{" "}
                    <span className="font-medium text-primary">
                      {formatPrice(feeAmount)}
                    </span>
                  </p>

                  <div className="mt-4 flex flex-col gap-2">
                    <span className="text-xs text-card-subtle">
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
                              ? modeButtonActiveClassName("dark")
                              : modeButtonInactiveClassName("dark")
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
                      <span className="text-xs text-card-subtle">
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
                        className={rangeDarkClassName}
                      />
                    </label>
                  ) : (
                    <label className="mt-4 block">
                      <span className="text-xs text-card-subtle">
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
                        <p className="mt-2 text-xs text-card-subtle">
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
                  <p className="text-xs font-medium uppercase tracking-[0.15em] text-card-subtle">
                    {t("result.notaryFeesTitle")}
                  </p>

                  <div className="mt-3 flex flex-col gap-2">
                    <span className="text-xs text-card-subtle">
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
                              ? modeButtonActiveClassName("dark")
                              : modeButtonInactiveClassName("dark")
                          }`}
                        >
                          {age === "OLD"
                            ? t("result.notaryOld")
                            : t("result.notaryNew")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-card-subtle">
                    {notaryPropertyAge === "NEW"
                      ? t("result.notaryFeesNewRange")
                      : t("result.notaryFeesOldRange")}
                  </p>
                  <p className="mt-2 text-sm text-card-muted">
                    {t("result.notaryFeesAmount")}{" "}
                    <span className="font-medium text-primary">
                      {formatPrice(notaryAmount)}
                    </span>
                  </p>
                  <label className="mt-4 block">
                    <span className="text-xs text-card-subtle">
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
                      className={rangeDarkClassName}
                    />
                  </label>
                  <p className="mt-2 text-xs text-card-faint">
                    {t("result.notaryFeesBase")}
                  </p>
                </div>

                <div className="min-w-0 space-y-2 border-t border-card-border pt-5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
                  <p className="text-sm text-card-muted">
                    {t("result.totalFeesAmount")}{" "}
                    <span className="font-medium text-primary">
                      {formatPrice(totalFeesAmount)}
                    </span>
                  </p>
                  <p>
                    <span className="text-xs font-medium uppercase tracking-[0.15em] text-card-subtle">
                      {t("result.totalBudget")}
                    </span>
                    <span className="mt-2 block font-sans text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
                      {formatPrice(totalBudget)}
                    </span>
                  </p>
                  <p className="text-xs text-card-faint">
                    {t("result.totalBudgetHint")}
                  </p>
                </div>
              </div>
            </section>
            );
          })()}

          {error && (
            <p
              className={alertErrorClassName}
              role="alert"
            >
              {error}
            </p>
          )}

          {(!result || formExpanded) && (
          <section
            ref={formSectionRef}
            className={`scroll-mt-24 ${sectionCardClassName}`}
          >
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {result && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-muted sm:flex-1">
                      {t("form.editHint")}
                    </p>
                    <button
                      type="button"
                      onClick={handleNewSimulation}
                      className={btnSecondarySmClassName}
                    >
                      {t("form.newSimulation")}
                    </button>
                  </div>
                )}
                {wizardErrorKey && (
                  <p
                    className={alertErrorClassName}
                    role="alert"
                  >
                    {t(`form.${wizardErrorKey}`)}
                  </p>
                )}

                <EstimateWizard
                  step={wizardStep}
                  stepLabels={wizardStepLabels}
                  stepHint={wizardStepHints[wizardStep]}
                  stepIndicator={t("form.wizardStepIndicator", {
                    current: wizardStep + 1,
                    total: wizardStepCount,
                  })}
                  showBack={wizardStep > 0}
                  backLabel={t("form.wizardBack")}
                  onBack={goWizardBack}
                  showNext={wizardStep < wizardStepCount - 1}
                  nextLabel={t("form.wizardNext")}
                  onNext={goWizardNext}
                  showSubmit={wizardStep === wizardStepCount - 1}
                  submitLabel={t("form.submit")}
                  submittingLabel={t("form.submitting")}
                  submitting={loading}
                >
                  {wizardStep === 0 && (
                    <>
                      <div className="flex flex-col gap-2">
                        <span className={labelClassName}>
                          {t("form.propertyType")}
                        </span>
                        <PropertyTypeChoice
                          value={propertyType}
                          apartmentLabel={t("form.apartment")}
                          houseLabel={t("form.house")}
                          onChange={handlePropertyTypeChange}
                        />
                      </div>

                      <label className="flex flex-col gap-2">
                        <span className={labelClassName}>{t("form.address")}</span>
                        <AddressAutocomplete
                          value={address}
                          onChange={setAddress}
                          minLength={10}
                          maxLength={255}
                          placeholder={t("form.addressPlaceholder")}
                          listLabel={t("form.addressSuggestions")}
                          loadingLabel={t("form.addressSuggestionsLoading")}
                          className={inputClassName}
                        />
                      </label>
                    </>
                  )}

                  {wizardStep === 1 && (
                    <>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <label className="flex flex-col gap-2">
                          <span className={labelClassName}>{t("form.surface")}</span>
                          <input
                            type="number"
                            value={sbati}
                            onChange={(e) => setSbati(e.target.value)}
                            min={11}
                            step={0.01}
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

                      <label className="flex flex-col gap-2 sm:max-w-[50%]">
                        <span className={labelClassName}>{t("form.year")}</span>
                        <input
                          type="number"
                          value={anneeConstruction}
                          onChange={(e) => setAnneeConstruction(e.target.value)}
                          min={1501}
                          max={new Date().getFullYear()}
                          className={inputClassName}
                        />
                      </label>
                    </>
                  )}

                  {wizardStep === 2 && (
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
                            ? "sm:grid-cols-2"
                            : "sm:grid-cols-1"
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
                            checked={hasPool}
                            onChange={(e) => setHasPool(e.target.checked)}
                            className="h-4 w-4 rounded border-border"
                          />
                          {t("form.pool")}
                        </label>
                      </div>
                    </fieldset>
                  )}

                  {wizardStep === 3 && (
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
                                  {t("form.conditionOption", {
                                    rating: String(rating),
                                    label: t(`form.conditionLevels.${rating}`),
                                  })}
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
                  )}

                  {wizardStep === 4 && isFloorAdjustmentApplicable(propertyType) && (
                    <fieldset className="space-y-3">
                      <legend
                        className={`${labelClassName} flex items-center gap-1.5 normal-case`}
                      >
                        {t("form.floorElevator")}
                        <FieldHint text={t("form.floorElevatorHint")} />
                      </legend>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-2">
                          <span className="text-sm text-foreground">
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
                          <span className="text-sm text-foreground">
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
                </EstimateWizard>
              </form>
          </section>
          )}


          {result && (
            <section className={sectionCardClassName}>
              <p className="text-sm font-medium text-foreground">
                {t("result.financeIntroTitle")}
              </p>
              <p className="mt-2 text-sm text-muted">
                {t("result.financeIntroHint")}
              </p>
              <Link
                href="/analysis"
                className={`mt-5 inline-block ${btnPrimaryClassName}`}
              >
                {t("result.financeIntroAction")}
              </Link>
            </section>
          )}


          {result && (
            <section className={sectionCardClassName}>
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
              className={linkUnderlineClassName}
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
                className={`${btnSecondaryClassName} sm:flex-1`}
              >
                {t("form.expandForm")}
              </button>
              <button
                type="button"
                onClick={handleNewSimulation}
                className={`${btnPrimaryClassName} sm:flex-1`}
              >
                {t("form.newSimulation")}
              </button>
            </div>
          </div>
        )}
    </main>
  );
}
