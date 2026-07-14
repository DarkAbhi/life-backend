"use client";

import Link from "next/link";
import { SubmitEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const apiBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type Vehicle = {
  id: number;
  name: string;
};

export default function Garage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [vehicleName, setVehicleName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadGarage() {
      try {
        const sessionResponse = await fetch(`${apiBaseURL}/api/auth/session`, {
          credentials: "include",
        });
        if (!sessionResponse.ok) {
          router.replace("/");
          return;
        }

        const vehiclesResponse = await fetch(`${apiBaseURL}/api/vehicles`, {
          credentials: "include",
        });
        if (!vehiclesResponse.ok) {
          setError("We couldn't load your vehicles. Please try again.");
          return;
        }
        setVehicles((await vehiclesResponse.json()) as Vehicle[]);
      } catch {
        setError("We couldn't reach the server. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadGarage();
  }, [router]);

  async function addVehicle(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch(`${apiBaseURL}/api/vehicles`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: vehicleName.trim() }),
      });
      const body = (await response.json()) as Vehicle & { error?: string };
      if (!response.ok) {
        setError(body.error ?? "We couldn't add that vehicle.");
        return;
      }
      setVehicles((currentVehicles) => [...currentVehicles, body]);
      setVehicleName("");
      setIsAddOpen(false);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf3] px-6 py-10 text-stone-800 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <Link className="text-sm font-semibold text-amber-800 transition hover:text-amber-950" href="/dashboard">
              ← Dashboard
            </Link>
            <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-amber-700">LIFE TRACKER</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">Garage</h1>
            <p className="mt-3 text-base text-stone-600">A simple home for every vehicle in your life.</p>
          </div>
          <button
            className="shrink-0 rounded-lg bg-amber-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-800 focus:outline-none focus:ring-4 focus:ring-amber-200"
            onClick={() => {
              setError("");
              setIsAddOpen(true);
            }}
            type="button"
          >
            + Add vehicle
          </button>
        </header>

        {isLoading ? (
          <p className="text-stone-600">Loading your vehicles…</p>
        ) : error && !isAddOpen ? (
          <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>
        ) : vehicles.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-amber-200 bg-white/70 p-10 text-center">
            <p className="text-lg font-semibold text-stone-800">Your garage is ready for its first vehicle.</p>
            <p className="mt-2 text-sm text-stone-600">Add one whenever you&apos;re ready.</p>
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Vehicles">
            {vehicles.map((vehicle) => (
              <article className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm" key={vehicle.id}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-lg" aria-hidden="true">🚗</div>
                <h2 className="mt-4 text-lg font-semibold text-stone-900">{vehicle.name}</h2>
                <p className="mt-1 text-sm text-stone-500">Vehicle #{vehicle.id}</p>
              </article>
            ))}
          </section>
        )}
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-stone-950/40 px-6" role="dialog" aria-labelledby="add-vehicle-title" aria-modal="true">
          <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-stone-900" id="add-vehicle-title">Add a vehicle</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">Give it a name you&apos;ll recognize right away.</p>
            <form className="mt-6 space-y-4" onSubmit={addVehicle}>
              <label className="block text-sm font-medium text-stone-700" htmlFor="vehicle-name">Vehicle name</label>
              <input
                autoFocus
                className="w-full rounded-lg border border-stone-300 px-4 py-3 outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
                id="vehicle-name"
                maxLength={48}
                onChange={(event) => setVehicleName(event.target.value)}
                placeholder="e.g. Honda City"
                required
                value={vehicleName}
              />
              {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  className="flex-1 rounded-lg border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
                  disabled={isSaving}
                  onClick={() => setIsAddOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="flex-1 rounded-lg bg-amber-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-amber-300"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? "Adding…" : "Add vehicle"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
