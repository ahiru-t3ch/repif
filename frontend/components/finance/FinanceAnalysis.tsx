"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { DpeRentalAlert } from "@/components/DpeRentalAlert";
import { EstimateRecapWithFees } from "@/components/EstimateRecapWithFees";
import { EstimateWizard } from "@/components/EstimateWizard";
import { FinanceYesNoChoice } from "@/components/FinanceYesNoChoice";
import { ShareScenarioControls } from "@/components/ShareScenarioControls";
import { OptionalNumberInput } from "@/components/OptionalNumberInput";
import { SavingsChart } from "@/components/SavingsChart";
import { priceWithAgencyFees } from "@/lib/agency-fees";
import {
  DEFAULT_CASH_SAVINGS_YEARS,
  DEFAULT_INFLATION_RATE,
  DEFAULT_SAVINGS_RATE,
  inflationAdjustedValue,
  savingsSnapshot,
  yearlySeries,
} from "@/lib/compound-savings";
import {
  DEFAULT_ANNUAL_CHARGES,
  DEFAULT_EXCEPTIONAL_CHARGES_PCT,
  DEFAULT_LOAN_DOWN_PAYMENT,
  DEFAULT_LOAN_DURATION_YEARS,
  DEFAULT_LOAN_INSURANCE_RATE,
  DEFAULT_LOAN_INTEREST_RATE,
  DEFAULT_MAINTENANCE_PCT,
  DEFAULT_MARGINAL_TAX_RATE,
  DEFAULT_NET_SALARY,
  DEFAULT_OCCUPANCY_RATE,
  DEFAULT_PROPERTY_APPRECIATION,
  DEFAULT_PROPERTY_TAX,
  DEFAULT_RENTAL_TAX_REGIME,
  createEmptyWorkLine,
  useEstimateSession,
  type MarginalTaxRate,
  type OccupancyRate,
  type RentalTaxRegime,
} from "@/lib/estimate-session/context";
import {
  FINANCE_WIZARD_LIVING_BUDGET_STEP,
  FINANCE_WIZARD_STEP_COUNT,
  getNextFinanceWizardStep,
  getPreviousFinanceWizardStep,
} from "@/lib/finance-wizard";
import {
  formatFeeRate as formatFeeRateDisplay,
  formatPrice as formatPriceDisplay,
} from "@/lib/format-display";
import { useI18n } from "@/lib/i18n/context";
import { useShareScenario } from "@/lib/use-share-scenario";
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
import { notaryFeeAmount } from "@/lib/notary-fees";
import {
  btnPrimaryClassName,
  btnSecondaryClassName,
  inputClassName,
  labelClassName,
  sectionCardClassName,
} from "@/lib/ui-classes";

const reportSectionClassName = sectionCardClassName;

function FinanceQuestionStep({
  title,
  hint,
  value,
  yesLabel,
  noLabel,
  onChange,
}: {
  title: string;
  hint: string;
  value: boolean;
  yesLabel: string;
  noLabel: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted">{hint}</p>
      </div>
      <FinanceYesNoChoice
        value={value}
        yesLabel={yesLabel}
        noLabel={noLabel}
        onChange={onChange}
      />
    </div>
  );
}

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
            ? "cursor-not-allowed bg-border"
            : checked
              ? "bg-primary"
              : "bg-border-strong"
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

type FinancePhase = "wizard" | "report";

export function FinanceAnalysis() {
  const { t, intlLocale } = useI18n();
  const {
    result,
    adjustedPrice,
    agencyFeeMode,
    agencyFeeRate,
    agencyFeeFixed,
    notaryFeeRate,
    dpeMedian,
    modelInputSnapshot,
    workLines,
    setWorkLines,
    worksPaidInCash,
    setWorksPaidInCash,
    showWorksSection,
    setShowWorksSection,
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
    financeAnalysisComplete,
    setFinanceAnalysisComplete,
  } = useEstimateSession();
  const { shareStatus, shareMessage, handleShareScenario } = useShareScenario();

  const [phase, setPhase] = useState<FinancePhase>("wizard");
  const [financeStep, setFinanceStep] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);

  const formatPrice = (value: number) => formatPriceDisplay(intlLocale, value);
  const formatFeeRate = (rate: number) => formatFeeRateDisplay(intlLocale, rate);

  const financeStepLabels = [
    t("result.financeWizardStep1Title"),
    t("result.financeWizardStep2Title"),
    t("result.financeWizardStep3Title"),
    t("result.financeWizardStep4Title"),
    t("result.financeWizardStep5Title"),
    t("result.financeWizardStep6Title"),
    t("result.financeWizardStep7Title"),
  ];
  const financeStepHints = [
    t("result.worksToggleHint"),
    t("result.ownershipToggleHint"),
    t("result.loanToggleHint"),
    t("result.livingBudgetToggleHint"),
    t("result.investmentToggleHint"),
    t("result.savingsToggleHint"),
    t("result.verdictToggleHint"),
  ];
  const skipLivingBudgetStep = !showOwnershipSection && !showLoanSection;

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

  function completeFinanceWizard() {
    setFinanceAnalysisComplete(true);
    setPhase("report");
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function restartFinanceWizard() {
    setFinanceAnalysisComplete(false);
    setPhase("wizard");
    setFinanceStep(0);
    resetFinanceSectionToggles();
    resetAllFinanceDefaults();
    setWorkLines([createEmptyWorkLine()]);
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function goFinanceNext() {
    setFinanceStep((current) =>
      getNextFinanceWizardStep(current, {
        skipLivingBudget: skipLivingBudgetStep,
      }),
    );
  }

  function goFinanceBack() {
    setFinanceStep((current) =>
      getPreviousFinanceWizardStep(current, {
        skipLivingBudget: skipLivingBudgetStep,
      }),
    );
  }

  useEffect(() => {
    if (financeAnalysisComplete) {
      setPhase("report");
      return;
    }

    const hasSavedFinanceAnswers =
      showWorksSection ||
      showOwnershipSection ||
      showLoanSection ||
      showLivingBudgetSection ||
      showInvestmentSection ||
      showSavingsSection ||
      showVerdictSection;

    if (hasSavedFinanceAnswers) {
      setPhase("wizard");
      return;
    }

    resetFinanceSectionToggles();
    resetAllFinanceDefaults();
    setWorkLines([createEmptyWorkLine()]);
    setPhase("wizard");
    setFinanceStep(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once on mount
  }, []);

  if (!result) {
    return null;
  }

  const displayPrice = adjustedPrice ?? Math.round(result.price);
  const hasAnyReportSection =
    showWorksSection ||
    showOwnershipSection ||
    showLoanSection ||
    showLivingBudgetSection ||
    showInvestmentSection ||
    showSavingsSection ||
    showVerdictSection;

  return (
    <>
    <div
      ref={topRef}
      className={`scroll-mt-24 flex flex-col gap-8${phase === "report" ? " pb-28" : ""}`}
    >
      {phase === "wizard" ? (
        <section className={reportSectionClassName}>
          <EstimateWizard
            step={financeStep}
            stepLabels={financeStepLabels}
            stepHint={financeStepHints[financeStep]}
            stepIndicator={t("result.financeStepIndicator", {
              current: financeStep + 1,
              total: FINANCE_WIZARD_STEP_COUNT,
            })}
            showBack={financeStep > 0}
            backLabel={t("form.wizardBack")}
            onBack={goFinanceBack}
            showNext={financeStep < FINANCE_WIZARD_STEP_COUNT - 1}
            nextLabel={t("form.wizardNext")}
            onNext={goFinanceNext}
            showSubmit={financeStep === FINANCE_WIZARD_STEP_COUNT - 1}
            submitLabel={t("result.financeWizardFinish")}
            submittingLabel=""
            submitting={false}
            onSubmitClick={completeFinanceWizard}
          >
            {financeStep === 0 && (
  <>
    <FinanceQuestionStep
      title={t("result.worksToggleTitle")}
      hint={t("result.worksToggleHint")}
      value={showWorksSection}
      yesLabel={t("form.yes")}
      noLabel={t("form.no")}
      onChange={handleWorksToggle}
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
      className="shrink-0 rounded-lg px-2.5 py-2 text-xs text-muted transition hover:bg-surface-muted hover:text-foreground"
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
  </>
)}

{financeStep === 1 && (
  <>
    <FinanceQuestionStep
      title={t("result.ownershipToggleTitle")}
      hint={t("result.ownershipToggleHint")}
      value={showOwnershipSection}
      yesLabel={t("form.yes")}
      noLabel={t("form.no")}
      onChange={handleOwnershipToggle}
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

                  <div className="mt-4 rounded-lg border border-border bg-surface-muted px-4 py-3">
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

                  <div className="mt-4 rounded-lg border border-border bg-surface-muted px-4 py-3">
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
  </>
)}

{financeStep === 2 && (
  <>
    <FinanceQuestionStep
      title={t("result.loanToggleTitle")}
      hint={t("result.loanToggleHint")}
      value={showLoanSection}
      yesLabel={t("form.yes")}
      noLabel={t("form.no")}
      onChange={handleLoanToggle}
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
  </>
)}

{financeStep === FINANCE_WIZARD_LIVING_BUDGET_STEP && (
  <>
    {skipLivingBudgetStep ? (
      <p className="text-sm text-muted">
        {t("result.livingBudgetInactiveNote")}
      </p>
    ) : (
      <>
        <FinanceQuestionStep
          title={t("result.livingBudgetToggleTitle")}
          hint={t("result.livingBudgetToggleHint")}
          value={showLivingBudgetSection}
          yesLabel={t("form.yes")}
          noLabel={t("form.no")}
          onChange={handleLivingBudgetToggle}
        />
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
        overDebtLimit ? "text-danger" : "text-foreground"
      }`}
    >
      {debtRatioPct !== null
        ? `${formatFeeRate(debtRatioPct)} %`
        : "—"}
    </p>
    {debtRatioPct !== null && (
      <p
        className={`mt-2 text-sm font-medium ${
          overDebtLimit ? "text-danger" : "text-foreground"
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
      </>
    )}
  </>
)}

{financeStep === 4 && (
  <>
    <FinanceQuestionStep
      title={t("result.investmentToggleTitle")}
      hint={t("result.investmentToggleHint")}
      value={showInvestmentSection}
      yesLabel={t("form.yes")}
      noLabel={t("form.no")}
      onChange={handleInvestmentToggle}
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
    <p className="mt-3 text-sm text-danger">
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
          cashFlow < 0 ? "text-danger" : "text-foreground"
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
            ? "text-danger"
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
            ? "text-danger"
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
  </>
)}

{financeStep === 5 && (
  <>
    <FinanceQuestionStep
      title={t("result.savingsToggleTitle")}
      hint={t("result.savingsToggleHint")}
      value={showSavingsSection}
      yesLabel={t("form.yes")}
      noLabel={t("form.no")}
      onChange={handleSavingsToggle}
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
  </>
)}

{financeStep === 6 && (
  <>
    <FinanceQuestionStep
      title={t("result.verdictToggleTitle")}
      hint={t("result.verdictToggleHint")}
      value={showVerdictSection}
      yesLabel={t("form.yes")}
      noLabel={t("form.no")}
      onChange={handleVerdictToggle}
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
                      </>
                    )}
          </EstimateWizard>
        </section>
      ) : (
        <>
          <section className={reportSectionClassName}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <p className="text-sm text-muted">{t("analysis.reportHint")}</p>
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
          <EstimateRecapWithFees
            variant="dark"
            showAddress
            headerLabel={t("analysis.reportTitle")}
          />

          {!hasAnyReportSection ? (
            <section className={reportSectionClassName}>
              <p className="text-sm text-muted">{t("analysis.noSections")}</p>
            </section>
          ) : (
            <>
              {showWorksSection && (
                <section className={reportSectionClassName}>
                  <h2 className="text-lg font-semibold text-foreground">{t("result.worksTitle")}</h2>
                  {(() => {
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
                          className="shrink-0 rounded-lg px-2.5 py-2 text-xs text-muted transition hover:bg-surface-muted hover:text-foreground"
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

              {showOwnershipSection && (
                <section className={reportSectionClassName}>
                  <h2 className="text-lg font-semibold text-foreground">{t("result.loanOwnershipTitle")}</h2>
                  {(() => {
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

                  <div className="mt-4 rounded-lg border border-border bg-surface-muted px-4 py-3">
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

                  <div className="mt-4 rounded-lg border border-border bg-surface-muted px-4 py-3">
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

              {showLoanSection && (
                <section className={reportSectionClassName}>
                  <h2 className="text-lg font-semibold text-foreground">{t("result.loanTitle")}</h2>
                  {(() => {
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

              {showLivingBudgetSection && (showOwnershipSection || showLoanSection) && (
                <section className={reportSectionClassName}>
                  <h2 className="text-lg font-semibold text-foreground">{t("result.financeWizardStep4Title")}</h2>
                  {(() => {
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
                            overDebtLimit ? "text-danger" : "text-foreground"
                          }`}
                        >
                          {debtRatioPct !== null
                            ? `${formatFeeRate(debtRatioPct)} %`
                            : "—"}
                        </p>
                        {debtRatioPct !== null && (
                          <p
                            className={`mt-2 text-sm font-medium ${
                              overDebtLimit ? "text-danger" : "text-foreground"
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

              {showInvestmentSection && (
                <section className={reportSectionClassName}>
                  <h2 className="text-lg font-semibold text-foreground">{t("result.financeWizardStep5Title")}</h2>
                  {(() => {
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
                        <p className="mt-3 text-sm text-danger">
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
                              cashFlow < 0 ? "text-danger" : "text-foreground"
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
                                ? "text-danger"
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
                                ? "text-danger"
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

              {showSavingsSection && (
                <section className={reportSectionClassName}>
                  <h2 className="text-lg font-semibold text-foreground">{t("result.savingsTitle")}</h2>
                  {(() => {
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

              {showVerdictSection && (
                <section className={reportSectionClassName}>
                  <h2 className="text-lg font-semibold text-foreground">{t("result.verdictTitle")}</h2>
                  {(() => {
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
            </>
          )}

          <section className={reportSectionClassName}>
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
        </>
      )}
    </div>

    {phase === "report" && (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={restartFinanceWizard}
            className={`${btnSecondaryClassName} sm:flex-1`}
          >
            {t("analysis.restartWizard")}
          </button>
          <Link
            href="/"
            className={`${btnPrimaryClassName} sm:flex-1 text-center`}
          >
            {t("analysis.backToEstimate")}
          </Link>
        </div>
      </div>
    )}
    </>
  );
}


