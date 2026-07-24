import type { PropertyType } from "@/lib/estimate-session/context";

export const ESTIMATE_WIZARD_MAX_STEP_COUNT = 5;

export function getEstimateWizardStepCount(propertyType: PropertyType): number {
  return propertyType === "APARTMENT"
    ? ESTIMATE_WIZARD_MAX_STEP_COUNT
    : ESTIMATE_WIZARD_MAX_STEP_COUNT - 1;
}

export type EstimateWizardFields = {
  propertyType: PropertyType;
  address: string;
  sbati: string;
  propertyRooms: string;
  sterr: string;
  nbParking: string;
  nbCave: string;
  dpeMedian: string;
  anneeConstruction: string;
};

export type EstimateWizardErrorKey =
  | "wizardErrorAddress"
  | "wizardErrorCharacteristics";

export function validateEstimateWizardStep(
  step: number,
  fields: EstimateWizardFields,
): EstimateWizardErrorKey | null {
  if (step === 0) {
    if (fields.address.trim().length < 10) {
      return "wizardErrorAddress";
    }
    return null;
  }

  if (step === 1) {
    const surface = Number(fields.sbati);
    if (!Number.isFinite(surface) || surface < 11) {
      return "wizardErrorCharacteristics";
    }
    if (fields.propertyRooms.trim() === "") {
      return "wizardErrorCharacteristics";
    }

    const landTrimmed = fields.sterr.trim();
    if (fields.propertyType === "HOUSE") {
      const land = Number(landTrimmed);
      if (!Number.isFinite(land) || land < 1) {
        return "wizardErrorCharacteristics";
      }
    } else if (landTrimmed !== "") {
      const land = Number(landTrimmed);
      if (!Number.isFinite(land) || land < 0 || land > 5000) {
        return "wizardErrorCharacteristics";
      }
    }

    if (fields.nbParking.trim() === "" || fields.nbCave.trim() === "") {
      return "wizardErrorCharacteristics";
    }
    if (fields.dpeMedian.trim() === "") {
      return "wizardErrorCharacteristics";
    }

    const year = Number(fields.anneeConstruction);
    const maxYear = new Date().getFullYear();
    if (!Number.isFinite(year) || year < 1501 || year > maxYear) {
      return "wizardErrorCharacteristics";
    }

    return null;
  }

  return null;
}
