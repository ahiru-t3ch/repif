"use client";

import {
  createContext,
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
  DEFAULT_LOAN_DOWN_PAYMENT,
  DEFAULT_LOAN_DURATION_YEARS,
  DEFAULT_LOAN_INSURANCE_RATE,
  DEFAULT_LOAN_INTEREST_RATE,
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
  DEFAULT_LOAN_DOWN_PAYMENT,
  DEFAULT_LOAN_DURATION_YEARS,
  DEFAULT_LOAN_INSURANCE_RATE,
  DEFAULT_LOAN_INTEREST_RATE,
  DEFAULT_NET_SALARY,
  DEFAULT_PROPERTY_APPRECIATION,
  DEFAULT_PROPERTY_TAX,
};

export { DEFAULT_INFLATION_RATE, DEFAULT_SAVINGS_RATE };

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
  result: PredictResult | null;
  setResult: Dispatch<SetStateAction<PredictResult | null>>;
  adjustedPrice: number | null;
  setAdjustedPrice: Dispatch<SetStateAction<number | null>>;
  workLines: WorkLine[];
  setWorkLines: Dispatch<SetStateAction<WorkLine[]>>;
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
  const [result, setResult] = useState<PredictResult | null>(null);
  const [adjustedPrice, setAdjustedPrice] = useState<number | null>(null);
  const [workLines, setWorkLines] = useState<WorkLine[]>([]);
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
      loanRent,
      setLoanRent,
      loanAnnualCharges,
      setLoanAnnualCharges,
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
    }),
    [
      propertyType,
      address,
      sbati,
      nbParking,
      nbCave,
      dpeMedian,
      anneeConstruction,
      result,
      adjustedPrice,
      workLines,
      loanDownPayment,
      loanDurationYears,
      loanInterestRate,
      loanInsuranceRate,
      loanRent,
      loanAnnualCharges,
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
