import type { AgencyFeeMode } from "@/lib/agency-fees";
import type {
  MarginalTaxRate,
  ModelInputSnapshot,
  OccupancyRate,
  PredictResult,
  PropertyType,
  RentalTaxRegime,
  WorkLine,
} from "@/lib/estimate-session/context";
import type { NotaryPropertyAge } from "@/lib/notary-fees";

export const SHARE_PAYLOAD_VERSION = 1 as const;

export type ShareScenarioPayload = {
  v: typeof SHARE_PAYLOAD_VERSION;
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
  hasElevator: boolean;
  unpopularTower: boolean;
  buildingStoreys: string;
  apartmentFloorNumber: string;
  result: PredictResult;
  adjustedPrice: number | null;
  workLines: WorkLine[];
  showWorksSection: boolean;
  worksPaidInCash: boolean;
  showOwnershipSection: boolean;
  showLoanSection: boolean;
  showLivingBudgetSection: boolean;
  showInvestmentSection: boolean;
  showSavingsSection: boolean;
  showVerdictSection: boolean;
  investmentTaxRegime: RentalTaxRegime;
  investmentMarginalTaxRate: MarginalTaxRate;
  investmentOccupancyRate: OccupancyRate;
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

export type ShareCreateResponse = {
  code: string;
  url_path: string;
  expires_at: string;
};

export type ShareGetResponse = {
  code: string;
  payload: ShareScenarioPayload;
  expires_at: string;
};

export function isShareScenarioPayload(
  value: unknown,
): value is ShareScenarioPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const payload = value as Partial<ShareScenarioPayload>;
  return (
    payload.v === SHARE_PAYLOAD_VERSION &&
    payload.result != null &&
    typeof payload.result === "object" &&
    typeof (payload.result as PredictResult).price === "number"
  );
}

export async function createShareScenario(
  payload: ShareScenarioPayload,
): Promise<ShareCreateResponse> {
  const response = await fetch("/api/shares", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      typeof data?.detail === "string" ? data.detail : "Share creation failed.";
    throw new Error(detail);
  }
  return data as ShareCreateResponse;
}

export async function fetchShareScenario(
  code: string,
): Promise<ShareGetResponse> {
  const response = await fetch(`/api/shares/${encodeURIComponent(code)}`, {
    method: "GET",
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail =
      typeof data?.detail === "string" ? data.detail : "Shared scenario not found.";
    throw new Error(detail);
  }
  if (!isShareScenarioPayload(data?.payload)) {
    throw new Error("Invalid shared scenario payload.");
  }
  return data as ShareGetResponse;
}
