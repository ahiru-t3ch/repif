"use client";

import { useState } from "react";

type PropertyType = "APARTMENT" | "HOUSE";

type PredictResult = {
  price: number;
  input_address: string;
  geocoded_address: string;
  geocode_score: number;
};

const DPE_OPTIONS = [
  { value: 1, label: "A" },
  { value: 2, label: "B" },
  { value: 3, label: "C" },
  { value: 4, label: "D" },
  { value: 5, label: "E" },
  { value: 6, label: "F" },
  { value: 7, label: "G" },
] as const;

function formatScore(score: number) {
  return `${Math.round(score * 100)} %`;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function propertyLabel(type: PropertyType) {
  return type === "APARTMENT" ? "Apartment" : "House";
}

function inputClassName() {
  return "rounded border border-zinc-300 px-3 py-2";
}

export default function Home() {
  const [propertyType, setPropertyType] = useState<PropertyType>("APARTMENT");
  const [address, setAddress] = useState("");
  const [sbati, setSbati] = useState("");
  const [nblocdep, setNblocdep] = useState("");
  const [dpeMedian, setDpeMedian] = useState("");
  const [anneeConstruction, setAnneeConstruction] = useState("");
  const [result, setResult] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePropertyTypeChange(next: PropertyType) {
    setPropertyType(next);
    setResult(null);
    setError(null);
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const endpoint =
      propertyType === "APARTMENT"
        ? "/api/predict/apartment"
        : "/api/predict/house";

    const body = {
      property_type: propertyType,
      address: address.trim(),
      sbati: Number(sbati),
      nblocdep: Number(nblocdep),
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
        let message = `API error (${response.status})`;
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
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col gap-8 px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold">REPIF</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Real Estate Prices In France — beta (indicative estimates from DVF+
          and DPE data)
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Property type
          <select
            value={propertyType}
            onChange={(e) =>
              handlePropertyTypeChange(e.target.value as PropertyType)
            }
            className={inputClassName()}
          >
            <option value="APARTMENT">Apartment</option>
            <option value="HOUSE">House</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Address
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            minLength={10}
            maxLength={255}
            placeholder="e.g. 10 rue de la Pomme 31000 Toulouse"
            required
            className={inputClassName()}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Built area — sbati (m²)
          <input
            type="number"
            value={sbati}
            onChange={(e) => setSbati(e.target.value)}
            min={11}
            step={0.01}
            required
            className={inputClassName()}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Outbuildings — nblocdep
          <input
            type="number"
            value={nblocdep}
            onChange={(e) => setNblocdep(e.target.value)}
            min={0}
            required
            className={inputClassName()}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Energy class — dpe_median
            <select
              value={dpeMedian}
              onChange={(e) => setDpeMedian(e.target.value)}
              required
              className={inputClassName()}
            >
              <option value="" disabled>
                Select a class
              </option>
              {DPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.value})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Construction year
            <input
              type="number"
              value={anneeConstruction}
              onChange={(e) => setAnneeConstruction(e.target.value)}
              min={1501}
              max={new Date().getFullYear()}
              required
              className={inputClassName()}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Predicting..." : "Predict price"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="flex flex-col gap-2">
          <p className="text-xl font-medium">
            Estimated {propertyLabel(propertyType).toLowerCase()} price:{" "}
            {formatPrice(result.price)}
          </p>
          <p className="text-sm text-zinc-600">
            Your address matched with a score of{" "}
            <span className="font-medium">{formatScore(result.geocode_score)}</span>.
          </p>
          <p className="text-sm text-zinc-600">
            Estimate based on the geocoded address:{" "}
            <span className="font-medium">{result.geocoded_address}</span>
          </p>
        </div>
      )}
    </main>
  );
}
