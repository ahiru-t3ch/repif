"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type PredictionRecord = {
  id: number;
  postal_code: string;
  room_count: number;
  living_area: number;
  predicted_price: number;
  created_at: string;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Home() {
  const [postalCode, setPostalCode] = useState("31000");
  const [roomCount, setRoomCount] = useState(3);
  const [livingArea, setLivingArea] = useState(65);
  const [price, setPrice] = useState<number | null>(null);
  const [history, setHistory] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    const response = await fetch(`${API_URL}/predictions`);
    if (!response.ok) return;
    const data: PredictionRecord[] = await response.json();
    setHistory(data);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPrice(null);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postal_code: postalCode,
          room_count: Number(roomCount),
          living_area: Number(livingArea),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error (${response.status})`);
      }

      const data: { price: number } = await response.json();
      setPrice(data.price);
      await fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col gap-8 px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold">REPIF</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Real Estate Prices In France — beta (Haute-Garonne, 31)
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Postal code
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            maxLength={5}
            required
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Number of rooms
          <input
            type="number"
            value={roomCount}
            onChange={(e) => setRoomCount(Number(e.target.value))}
            min={1}
            required
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Living area (m²)
          <input
            type="number"
            value={livingArea}
            onChange={(e) => setLivingArea(Number(e.target.value))}
            min={1}
            required
            className="rounded border border-zinc-300 px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Predicting..." : "Predict price"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {price !== null && (
        <p className="text-xl font-medium">
          Estimated price: {formatPrice(price)}
        </p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-medium">Recent predictions</h2>
        {history.length === 0 ? (
          <p className="text-sm text-zinc-500">No predictions yet.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {history.map((item) => (
              <li
                key={item.id}
                className="rounded border border-zinc-200 px-3 py-2"
              >
                {item.postal_code} · {item.living_area} m² · {item.room_count}{" "}
                rooms → {formatPrice(item.predicted_price)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
