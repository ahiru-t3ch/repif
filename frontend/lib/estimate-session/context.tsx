"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

import {
  AGENCY_FEE_PERCENT,
  type AgencyFeeMode,
} from "@/lib/agency-fees";
import {
  DEFAULT_ANNUAL_CHARGES,
  DEFAULT_EXCEPTIONAL_CHARGES_PCT,
  DEFAULT_LOAN_DOWN_PAYMENT,
  DEFAULT_LOAN_DURATION_YEARS,
  DEFAULT_LOAN_INSURANCE_RATE,
  DEFAULT_LOAN_INTEREST_RATE,
  DEFAULT_MAINTENANCE_PCT,
  DEFAULT_NET_SALARY,
  DEFAULT_PROPERTY_APPRECIATION,
  DEFAULT_PROPERTY_TAX,
} from "@/lib/mortgage";
import {
  DEFAULT_INFLATION_RATE,
  DEFAULT_SAVINGS_RATE,
} from "@/lib/compound-savings";
import { NOTARY_OLD, type NotaryPropertyAge } from "@/lib/notary-fees";

export type PropertyType = "APARTMENT" | "HOUSE";

export type PredictResult = {
  price: number;
  price_low: number;
  price_high: number;
  input_address: string;
  geocoded_address: string;
  geocode_score: number;
};

export type ModelInputSnapshot = {
  propertyType: PropertyType;
  address: string;
  sbati: number;
  nbParking: number;
  nbCave: number;
  dpeMedian: number;
  anneeConstruction: number;
  hasBalcony: boolean;
  hasGarden: boolean;
  hasPool: boolean;
};

export type WorkLine = {
  id: string;
  label: string;
  amount: number;
};

export function createEmptyWorkLine(): WorkLine {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `work-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    label: "",
    amount: 0,
  };
}

export const DEFAULT_AGENCY_FEE_RATE = AGENCY_FEE_PERCENT.defaultRate;
export const DEFAULT_NOTARY_FEE_RATE: number = NOTARY_OLD.default;

export {
  DEFAULT_ANNUAL_CHARGES,
  DEFAULT_EXCEPTIONAL_CHARGES_PCT,
  DEFAULT_LOAN_DOWN_PAYMENT,
  DEFAULT_LOAN_DURATION_YEARS,
  DEFAULT_LOAN_INSURANCE_RATE,
  DEFAULT_LOAN_INTEREST_RATE,
  DEFAULT_MAINTENANCE_PCT,
  DEFAULT_NET_SALARY,
  DEFAULT_PROPERTY_APPRECIATION,
  DEFAULT_PROPERTY_TAX,
};

export { DEFAULT_INFLATION_RATE, DEFAULT_SAVINGS_RATE };

export type EstimateSessionSnapshot = {
  propertyType: PropertyType;
  address: string;
  sbati: string;
  nbParking: string;
  nbCave: string;
  dpeMedian: string;
  anneeConstruction: string;
  hasBalcony: boolean;
  hasGarden: boolean;
  hasPool: boolean;
  result: PredictResult | null;
  adjustedPrice: number | null;
  workLines: WorkLine[];
  showWorksSection: boolean;
  showOwnershipSection: boolean;
  showLoanSection: boolean;
  showLivingBudgetSection: boolean;
  showSavingsSection: boolean;
  showVerdictSection: boolean;
  loanDownPayment: number;
  loanDurationYears: number;
  loanInterestRate: number;
  loanInsuranceRate: number;
  loanRent: number | null;
  loanAnnualCharges: number;
  exceptionalChargesEnabled: boolean;
  exceptionalChargesPct: number;
  maintenanceEnabled: boolean;
  maintenancePct: number;
  loanPropertyTax: number;
  loanNetSalary: number;
  savingsRate: number;
  savingsInflation: number;
  propertyAppreciation: number;
  modelInputSnapshot: ModelInputSnapshot | null;
  agencyFeeMode: AgencyFeeMode;
  agencyFeeRate: number;
  agencyFeeFixed: number;
  notaryFeeRate: number;
  notaryPropertyAge: NotaryPropertyAge;
};

type EstimateSessionContextValue = {
  propertyType: PropertyType;
  setPropertyType: Dispatch<SetStateAction<PropertyType>>;
  address: string;
  setAddress: Dispatch<SetStateAction<string>>;
  sbati: string;
  setSbati: Dispatch<SetStateAction<string>>;
  nbParking: string;
  setNbParking: Dispatch<SetStateAction<string>>;
  nbCave: string;
  setNbCave: Dispatch<SetStateAction<string>>;
  dpeMedian: string;
  setDpeMedian: Dispatch<SetStateAction<string>>;
  anneeConstruction: string;
  setAnneeConstruction: Dispatch<SetStateAction<string>>;
  hasBalcony: boolean;
  setHasBalcony: Dispatch<SetStateAction<boolean>>;
  hasGarden: boolean;
  setHasGarden: Dispatch<SetStateAction<boolean>>;
  hasPool: boolean;
  setHasPool: Dispatch<SetStateAction<boolean>>;
  result: PredictResult | null;
  setResult: Dispatch<SetStateAction<PredictResult | null>>;
  adjustedPrice: number | null;
  setAdjustedPrice: Dispatch<SetStateAction<number | null>>;
  workLines: WorkLine[];
  setWorkLines: Dispatch<SetStateAction<WorkLine[]>>;
  showWorksSection: boolean;
  setShowWorksSection: Dispatch<SetStateAction<boolean>>;
  showOwnershipSection: boolean;
  setShowOwnershipSection: Dispatch<SetStateAction<boolean>>;
  showLoanSection: boolean;
  setShowLoanSection: Dispatch<SetStateAction<boolean>>;
  showLivingBudgetSection: boolean;
  setShowLivingBudgetSection: Dispatch<SetStateAction<boolean>>;
  showSavingsSection: boolean;
  setShowSavingsSection: Dispatch<SetStateAction<boolean>>;
  showVerdictSection: boolean;
  setShowVerdictSection: Dispatch<SetStateAction<boolean>>;
  loanDownPayment: number;
  setLoanDownPayment: Dispatch<SetStateAction<number>>;
  loanDurationYears: number;
  setLoanDurationYears: Dispatch<SetStateAction<number>>;
  loanInterestRate: number;
  setLoanInterestRate: Dispatch<SetStateAction<number>>;
  loanInsuranceRate: number;
  setLoanInsuranceRate: Dispatch<SetStateAction<number>>;
  /** null = follow defaultMonthlyRent(propertyPrice) */
  loanRent: number | null;
  setLoanRent: Dispatch<SetStateAction<number | null>>;
  loanAnnualCharges: number;
  setLoanAnnualCharges: Dispatch<SetStateAction<number>>;
  exceptionalChargesEnabled: boolean;
  setExceptionalChargesEnabled: Dispatch<SetStateAction<boolean>>;
  exceptionalChargesPct: number;
  setExceptionalChargesPct: Dispatch<SetStateAction<number>>;
  maintenanceEnabled: boolean;
  setMaintenanceEnabled: Dispatch<SetStateAction<boolean>>;
  maintenancePct: number;
  setMaintenancePct: Dispatch<SetStateAction<number>>;
  loanPropertyTax: number;
  setLoanPropertyTax: Dispatch<SetStateAction<number>>;
  loanNetSalary: number;
  setLoanNetSalary: Dispatch<SetStateAction<number>>;
  savingsRate: number;
  setSavingsRate: Dispatch<SetStateAction<number>>;
  savingsInflation: number;
  setSavingsInflation: Dispatch<SetStateAction<number>>;
  propertyAppreciation: number;
  setPropertyAppreciation: Dispatch<SetStateAction<number>>;
  modelInputSnapshot: ModelInputSnapshot | null;
  setModelInputSnapshot: Dispatch<SetStateAction<ModelInputSnapshot | null>>;
  agencyFeeMode: AgencyFeeMode;
  setAgencyFeeMode: Dispatch<SetStateAction<AgencyFeeMode>>;
  agencyFeeRate: number;
  setAgencyFeeRate: Dispatch<SetStateAction<number>>;
  agencyFeeFixed: number;
  setAgencyFeeFixed: Dispatch<SetStateAction<number>>;
  notaryFeeRate: number;
  setNotaryFeeRate: Dispatch<SetStateAction<number>>;
  notaryPropertyAge: NotaryPropertyAge;
  setNotaryPropertyAge: Dispatch<SetStateAction<NotaryPropertyAge>>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  getShareSnapshot: () => EstimateSessionSnapshot | null;
  hydrateFromShare: (snapshot: EstimateSessionSnapshot) => void;
};

const EstimateSessionContext = createContext<EstimateSessionContextValue | null>(
  null,
);

export function EstimateSessionProvider({ children }: { children: ReactNode }) {
  const [propertyType, setPropertyType] = useState<PropertyType>("APARTMENT");
  const [address, setAddress] = useState("");
  const [sbati, setSbati] = useState("");
  const [nbParking, setNbParking] = useState("");
  const [nbCave, setNbCave] = useState("");
  const [dpeMedian, setDpeMedian] = useState("");
  const [anneeConstruction, setAnneeConstruction] = useState("");
  const [hasBalcony, setHasBalcony] = useState(false);
  const [hasGarden, setHasGarden] = useState(false);
  const [hasPool, setHasPool] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [adjustedPrice, setAdjustedPrice] = useState<number | null>(null);
  const [workLines, setWorkLines] = useState<WorkLine[]>([]);
  const [showWorksSection, setShowWorksSection] = useState(false);
  const [showOwnershipSection, setShowOwnershipSection] = useState(false);
  const [showLoanSection, setShowLoanSection] = useState(false);
  const [showLivingBudgetSection, setShowLivingBudgetSection] = useState(false);
  const [showSavingsSection, setShowSavingsSection] = useState(false);
  const [showVerdictSection, setShowVerdictSection] = useState(false);
  const [loanDownPayment, setLoanDownPayment] = useState(DEFAULT_LOAN_DOWN_PAYMENT);
  const [loanDurationYears, setLoanDurationYears] = useState(
    DEFAULT_LOAN_DURATION_YEARS,
  );
  const [loanInterestRate, setLoanInterestRate] = useState(
    DEFAULT_LOAN_INTEREST_RATE,
  );
  const [loanInsuranceRate, setLoanInsuranceRate] = useState(
    DEFAULT_LOAN_INSURANCE_RATE,
  );
  const [loanRent, setLoanRent] = useState<number | null>(null);
  const [loanAnnualCharges, setLoanAnnualCharges] = useState(
    DEFAULT_ANNUAL_CHARGES,
  );
  const [exceptionalChargesEnabled, setExceptionalChargesEnabled] =
    useState(false);
  const [exceptionalChargesPct, setExceptionalChargesPct] = useState(
    DEFAULT_EXCEPTIONAL_CHARGES_PCT,
  );
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenancePct, setMaintenancePct] = useState(DEFAULT_MAINTENANCE_PCT);
  const [loanPropertyTax, setLoanPropertyTax] = useState(DEFAULT_PROPERTY_TAX);
  const [loanNetSalary, setLoanNetSalary] = useState(DEFAULT_NET_SALARY);
  const [savingsRate, setSavingsRate] = useState(DEFAULT_SAVINGS_RATE);
  const [savingsInflation, setSavingsInflation] = useState(DEFAULT_INFLATION_RATE);
  const [propertyAppreciation, setPropertyAppreciation] = useState(
    DEFAULT_PROPERTY_APPRECIATION,
  );
  const [modelInputSnapshot, setModelInputSnapshot] =
    useState<ModelInputSnapshot | null>(null);
  const [agencyFeeMode, setAgencyFeeMode] = useState<AgencyFeeMode>("percent");
  const [agencyFeeRate, setAgencyFeeRate] = useState<number>(DEFAULT_AGENCY_FEE_RATE);
  const [agencyFeeFixed, setAgencyFeeFixed] = useState<number>(0);
  const [notaryFeeRate, setNotaryFeeRate] = useState<number>(DEFAULT_NOTARY_FEE_RATE);
  const [notaryPropertyAge, setNotaryPropertyAge] =
    useState<NotaryPropertyAge>("OLD");
  const [error, setError] = useState<string | null>(null);

  const getShareSnapshot = useCallback((): EstimateSessionSnapshot | null => {
    if (!result) {
      return null;
    }
    return {
      propertyType,
      address,
      sbati,
      nbParking,
      nbCave,
      dpeMedian,
      anneeConstruction,
      hasBalcony,
      hasGarden,
      hasPool,
      result,
      adjustedPrice,
      workLines,
      showWorksSection,
      showOwnershipSection,
      showLoanSection,
      showLivingBudgetSection,
      showSavingsSection,
      showVerdictSection,
      loanDownPayment,
      loanDurationYears,
      loanInterestRate,
      loanInsuranceRate,
      loanRent,
      loanAnnualCharges,
      exceptionalChargesEnabled,
      exceptionalChargesPct,
      maintenanceEnabled,
      maintenancePct,
      loanPropertyTax,
      loanNetSalary,
      savingsRate,
      savingsInflation,
      propertyAppreciation,
      modelInputSnapshot,
      agencyFeeMode,
      agencyFeeRate,
      agencyFeeFixed,
      notaryFeeRate,
      notaryPropertyAge,
    };
  }, [
    propertyType,
    address,
    sbati,
    nbParking,
    nbCave,
    dpeMedian,
    anneeConstruction,
    hasBalcony,
    hasGarden,
    hasPool,
    result,
    adjustedPrice,
    workLines,
    showWorksSection,
    showOwnershipSection,
    showLoanSection,
    showLivingBudgetSection,
    showSavingsSection,
    showVerdictSection,
    loanDownPayment,
    loanDurationYears,
    loanInterestRate,
    loanInsuranceRate,
    loanRent,
    loanAnnualCharges,
    exceptionalChargesEnabled,
    exceptionalChargesPct,
    maintenanceEnabled,
    maintenancePct,
    loanPropertyTax,
    loanNetSalary,
    savingsRate,
    savingsInflation,
    propertyAppreciation,
    modelInputSnapshot,
    agencyFeeMode,
    agencyFeeRate,
    agencyFeeFixed,
    notaryFeeRate,
    notaryPropertyAge,
  ]);

  const hydrateFromShare = useCallback((snapshot: EstimateSessionSnapshot) => {
    setPropertyType(snapshot.propertyType);
    setAddress(snapshot.address);
    setSbati(snapshot.sbati);
    setNbParking(snapshot.nbParking);
    setNbCave(snapshot.nbCave);
    setDpeMedian(snapshot.dpeMedian);
    setAnneeConstruction(snapshot.anneeConstruction);
    setHasBalcony(Boolean(snapshot.hasBalcony));
    setHasGarden(Boolean(snapshot.hasGarden));
    setHasPool(Boolean(snapshot.hasPool));
    setResult(snapshot.result);
    setAdjustedPrice(snapshot.adjustedPrice);
    setWorkLines(snapshot.workLines ?? []);
    setShowWorksSection(Boolean(snapshot.showWorksSection));
    setShowOwnershipSection(Boolean(snapshot.showOwnershipSection));
    setShowLoanSection(Boolean(snapshot.showLoanSection));
    setShowLivingBudgetSection(Boolean(snapshot.showLivingBudgetSection));
    setShowSavingsSection(Boolean(snapshot.showSavingsSection));
    setShowVerdictSection(Boolean(snapshot.showVerdictSection));
    setLoanDownPayment(snapshot.loanDownPayment);
    setLoanDurationYears(snapshot.loanDurationYears);
    setLoanInterestRate(snapshot.loanInterestRate);
    setLoanInsuranceRate(snapshot.loanInsuranceRate);
    setLoanRent(snapshot.loanRent);
    setLoanAnnualCharges(snapshot.loanAnnualCharges);
    setExceptionalChargesEnabled(Boolean(snapshot.exceptionalChargesEnabled));
    setExceptionalChargesPct(snapshot.exceptionalChargesPct);
    setMaintenanceEnabled(Boolean(snapshot.maintenanceEnabled));
    setMaintenancePct(snapshot.maintenancePct);
    setLoanPropertyTax(snapshot.loanPropertyTax);
    setLoanNetSalary(snapshot.loanNetSalary);
    setSavingsRate(snapshot.savingsRate);
    setSavingsInflation(snapshot.savingsInflation);
    setPropertyAppreciation(snapshot.propertyAppreciation);
    setModelInputSnapshot(snapshot.modelInputSnapshot);
    setAgencyFeeMode(snapshot.agencyFeeMode);
    setAgencyFeeRate(snapshot.agencyFeeRate);
    setAgencyFeeFixed(snapshot.agencyFeeFixed);
    setNotaryFeeRate(snapshot.notaryFeeRate);
    setNotaryPropertyAge(snapshot.notaryPropertyAge);
    setError(null);
  }, []);

  const value = useMemo<EstimateSessionContextValue>(
    () => ({
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
      hasBalcony,
      setHasBalcony,
      hasGarden,
      setHasGarden,
      hasPool,
      setHasPool,
      result,
      setResult,
      adjustedPrice,
      setAdjustedPrice,
      workLines,
      setWorkLines,
      showWorksSection,
      setShowWorksSection,
      showOwnershipSection,
      setShowOwnershipSection,
      showLoanSection,
      setShowLoanSection,
      showLivingBudgetSection,
      setShowLivingBudgetSection,
      showSavingsSection,
      setShowSavingsSection,
      showVerdictSection,
      setShowVerdictSection,
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
      hydrateFromShare,
    }),
    [
      propertyType,
      address,
      sbati,
      nbParking,
      nbCave,
      dpeMedian,
      anneeConstruction,
      hasBalcony,
      hasGarden,
      hasPool,
      result,
      adjustedPrice,
      workLines,
      showWorksSection,
      showOwnershipSection,
      showLoanSection,
      showLivingBudgetSection,
      showSavingsSection,
      showVerdictSection,
      loanDownPayment,
      loanDurationYears,
      loanInterestRate,
      loanInsuranceRate,
      loanRent,
      loanAnnualCharges,
      exceptionalChargesEnabled,
      exceptionalChargesPct,
      maintenanceEnabled,
      maintenancePct,
      loanPropertyTax,
      loanNetSalary,
      savingsRate,
      savingsInflation,
      propertyAppreciation,
      modelInputSnapshot,
      agencyFeeMode,
      agencyFeeRate,
      agencyFeeFixed,
      notaryFeeRate,
      notaryPropertyAge,
      error,
      getShareSnapshot,
      hydrateFromShare,
    ],
  );

  return (
    <EstimateSessionContext.Provider value={value}>
      {children}
    </EstimateSessionContext.Provider>
  );
}

export function useEstimateSession(): EstimateSessionContextValue {
  const context = useContext(EstimateSessionContext);
  if (!context) {
    throw new Error("useEstimateSession must be used within EstimateSessionProvider");
  }
  return context;
}
