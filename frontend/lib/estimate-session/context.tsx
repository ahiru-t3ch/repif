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

import { NOTARY_OLD, type NotaryPropertyAge } from "@/lib/notary-fees";

export type PropertyType = "APARTMENT" | "HOUSE";

export type PredictResult = {
  price: number;
  input_address: string;
  geocoded_address: string;
  geocode_score: number;
};

export type ModelInputSnapshot = {
  propertyType: PropertyType;
  address: string;
  sbati: number;
  nblocdep: number;
  dpeMedian: number;
  anneeConstruction: number;
};

export const DEFAULT_AGENCY_FEE_RATE = 4;
export const DEFAULT_NOTARY_FEE_RATE: number = NOTARY_OLD.default;

type EstimateSessionContextValue = {
  propertyType: PropertyType;
  setPropertyType: Dispatch<SetStateAction<PropertyType>>;
  address: string;
  setAddress: Dispatch<SetStateAction<string>>;
  sbati: string;
  setSbati: Dispatch<SetStateAction<string>>;
  nblocdep: string;
  setNblocdep: Dispatch<SetStateAction<string>>;
  dpeMedian: string;
  setDpeMedian: Dispatch<SetStateAction<string>>;
  anneeConstruction: string;
  setAnneeConstruction: Dispatch<SetStateAction<string>>;
  result: PredictResult | null;
  setResult: Dispatch<SetStateAction<PredictResult | null>>;
  modelInputSnapshot: ModelInputSnapshot | null;
  setModelInputSnapshot: Dispatch<SetStateAction<ModelInputSnapshot | null>>;
  agencyFeeRate: number;
  setAgencyFeeRate: Dispatch<SetStateAction<number>>;
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
  const [nblocdep, setNblocdep] = useState("");
  const [dpeMedian, setDpeMedian] = useState("");
  const [anneeConstruction, setAnneeConstruction] = useState("");
  const [result, setResult] = useState<PredictResult | null>(null);
  const [modelInputSnapshot, setModelInputSnapshot] =
    useState<ModelInputSnapshot | null>(null);
  const [agencyFeeRate, setAgencyFeeRate] = useState<number>(DEFAULT_AGENCY_FEE_RATE);
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
      agencyFeeRate,
      setAgencyFeeRate,
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
      nblocdep,
      dpeMedian,
      anneeConstruction,
      result,
      modelInputSnapshot,
      agencyFeeRate,
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
