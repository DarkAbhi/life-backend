"use client";

import Link from "next/link";
import { SubmitEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FuelForm, FuelFormItem } from "../components/fuel-form";
import ConfirmationDialog from "../components/design-system/confirmation-dialog";

const apiBaseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type Vehicle = {
  id: number;
  name: string;
};

type AirFill = {
  vehicle_id: number;
  filled_at: string;
};
type FuelItem = FuelFormItem;
const newFuelItem = (): FuelItem => ({
  fuelType: "petrol",
  fillType: "full",
  quantity: "",
  unitPrice: "",
  totalCost: "",
});
const localDateTime = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

const airFillFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export default function Garage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [vehicleName, setVehicleName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [latestAirFills, setLatestAirFills] = useState<Record<number, string>>(
    {},
  );
  const [pendingAirFillVehicle, setPendingAirFillVehicle] =
    useState<Vehicle | null>(null);
  const [isMarkingAirFill, setIsMarkingAirFill] = useState(false);
  const [airFillError, setAirFillError] = useState("");
  const [fuelVehicle, setFuelVehicle] = useState<Vehicle | null>(null);
  const [fuelOdometer, setFuelOdometer] = useState("");
  const [fuelDateTime, setFuelDateTime] = useState(localDateTime());
  const [stationName, setStationName] = useState("");
  const [fuelNotes, setFuelNotes] = useState("");
  const [fuelItems, setFuelItems] = useState<FuelItem[]>([newFuelItem()]);
  const [isSavingFuel, setIsSavingFuel] = useState(false);
  const [fuelError, setFuelError] = useState("");

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

        const airFillsResponse = await fetch(
          `${apiBaseURL}/api/vehicle-air-fills/latest`,
          {
            credentials: "include",
          },
        );
        if (!airFillsResponse.ok) {
          setError(
            "We couldn't load your vehicle maintenance status. Please try again.",
          );
          return;
        }
        const airFills = (await airFillsResponse.json()) as AirFill[];
        setLatestAirFills(
          Object.fromEntries(
            airFills.map((fill) => [fill.vehicle_id, fill.filled_at]),
          ),
        );
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

  async function markAirFill() {
    if (!pendingAirFillVehicle) return;
    setAirFillError("");
    setIsMarkingAirFill(true);
    try {
      const response = await fetch(
        `${apiBaseURL}/api/vehicles/${pendingAirFillVehicle.id}/air-fills`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const body = (await response.json()) as {
        filled_at?: string;
        error?: string;
      };
      if (!response.ok || !body.filled_at) {
        setAirFillError(
          body.error ?? "We couldn't record the air fill. Please try again.",
        );
        return;
      }
      setLatestAirFills((current) => ({
        ...current,
        [pendingAirFillVehicle.id]: body.filled_at!,
      }));
      setPendingAirFillVehicle(null);
    } catch {
      setAirFillError("We couldn't reach the server. Please try again.");
    } finally {
      setIsMarkingAirFill(false);
    }
  }

  async function saveFuel(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fuelVehicle) return;
    setFuelError("");
    setIsSavingFuel(true);
    const numberOrNull = (value: string) =>
      value === "" ? null : Number(value);
    try {
      const response = await fetch(
        `${apiBaseURL}/api/vehicles/${fuelVehicle.id}/fuel-fillups`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            odometer_km: Number(fuelOdometer),
            filled_at: new Date(fuelDateTime).toISOString(),
            station_name: stationName || null,
            notes: fuelNotes || null,
            items: fuelItems.map((item) => ({
              fuel_type: item.fuelType,
              fill_type: item.fillType,
              quantity: numberOrNull(item.quantity),
              unit_price: numberOrNull(item.unitPrice),
              total_cost: numberOrNull(item.totalCost),
            })),
          }),
        },
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setFuelError(body.error ?? "We couldn't save this fuel entry.");
        return;
      }
      setFuelVehicle(null);
      setFuelOdometer("");
      setFuelDateTime(localDateTime());
      setStationName("");
      setFuelNotes("");
      setFuelItems([newFuelItem()]);
    } catch {
      setFuelError("We couldn't reach the server. Please try again.");
    } finally {
      setIsSavingFuel(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <Link
              className="text-sm font-semibold text-primary transition hover:opacity-80"
              href="/dashboard"
            >
              ← Dashboard
            </Link>
            <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-primary">
              LIFE TRACKER
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Garage
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              A simple home for every vehicle in your life.
            </p>
          </div>
          <button
            className="shrink-0 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/20"
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
          <p className="text-muted-foreground">Loading your vehicles…</p>
        ) : error && !isAddOpen ? (
          <p
            className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        ) : vehicles.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-card/70 p-10 text-center">
            <p className="text-lg font-semibold text-foreground">
              Your garage is ready for its first vehicle.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add one whenever you&apos;re ready.
            </p>
          </section>
        ) : (
          <section
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Vehicles"
          >
            {vehicles.map((vehicle) => (
              <article
                className="cursor-pointer rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                key={vehicle.id}
                onClick={() => router.push(`/garage/${vehicle.id}`)}
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground text-lg"
                  aria-hidden="true"
                >
                  🚗
                </div>
                <h2 className="mt-4 text-lg font-semibold text-foreground">
                  {vehicle.name}
                </h2>
                <p className="mt-4 text-sm text-muted-foreground">
                  {latestAirFills[vehicle.id]
                    ? `Air last filled ${airFillFormatter.format(new Date(latestAirFills[vehicle.id]))}`
                    : "No air fill recorded yet."}
                </p>
                <button
                  className="mt-4 w-full rounded-lg border border-border px-4 py-3 text-sm font-semibold text-primary transition hover:bg-accent"
                  onClick={(event) => {
                    event.stopPropagation();
                    setAirFillError("");
                    setPendingAirFillVehicle(vehicle);
                  }}
                  type="button"
                >
                  Mark air filled now
                </button>
                <button
                  className="mt-3 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  onClick={(event) => {
                    event.stopPropagation();
                    setFuelError("");
                    setFuelVehicle(vehicle);
                  }}
                  type="button"
                >
                  Add fuel
                </button>
              </article>
            ))}
          </section>
        )}
      </div>

      {isAddOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-overlay-bg px-6"
          role="dialog"
          aria-labelledby="add-vehicle-title"
          aria-modal="true"
        >
          <section className="w-full max-w-md rounded-2xl bg-card border border-border p-8 shadow-2xl">
            <h2
              className="text-2xl font-bold tracking-tight text-foreground"
              id="add-vehicle-title"
            >
              Add a vehicle
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Give it a name you&apos;ll recognize right away.
            </p>
            <form className="mt-6 space-y-4" onSubmit={addVehicle}>
              <label
                className="block text-sm font-medium text-muted-foreground"
                htmlFor="vehicle-name"
              >
                Vehicle name
              </label>
              <input
                autoFocus
                className="w-full rounded-lg border border-border bg-background text-foreground px-4 py-3 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                id="vehicle-name"
                maxLength={48}
                onChange={(event) => setVehicleName(event.target.value)}
                placeholder="e.g. Honda City"
                required
                value={vehicleName}
              />
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  className="flex-1 rounded-lg border border-btn-cancel-border bg-btn-cancel-bg text-btn-cancel-text hover:bg-btn-cancel-hover px-4 py-3 text-sm font-semibold transition"
                  disabled={isSaving}
                  onClick={() => setIsAddOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="flex-1 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
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

      <ConfirmationDialog
        isOpen={!!pendingAirFillVehicle}
        onClose={() => setPendingAirFillVehicle(null)}
        onConfirm={() => void markAirFill()}
        title="Mark air filled?"
        description={
          pendingAirFillVehicle
             ? `Record that you filled air in ${pendingAirFillVehicle.name} right now. We'll remind you again in 30 days.`
            : ""
        }
        confirmText="Yes, mark air filled"
        confirmLoadingText="Marking…"
        isLoading={isMarkingAirFill}
        error={airFillError}
        variant="amber"
      />

      {fuelVehicle && (
        <div
          className="fixed inset-0 z-10 overflow-y-auto bg-overlay-bg px-6 py-8"
          role="dialog"
          aria-labelledby="fuel-title"
          aria-modal="true"
        >
          <section className="mx-auto w-full max-w-2xl rounded-2xl bg-card border border-border p-6 shadow-2xl sm:p-8">
            <h2
              className="text-2xl font-bold tracking-tight text-foreground"
              id="fuel-title"
            >
              Add fuel for {fuelVehicle.name}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter any two fuel-cost values; the third is calculated
              automatically when saved.
            </p>
            <FuelForm
              error={fuelError}
              filledAt={fuelDateTime}
              isSaving={isSavingFuel}
              items={fuelItems}
              notes={fuelNotes}
              odometer={fuelOdometer}
              onCancel={() => setFuelVehicle(null)}
              onFilledAtChange={setFuelDateTime}
              onItemsChange={setFuelItems}
              onNotesChange={setFuelNotes}
              onOdometerChange={setFuelOdometer}
              onStationNameChange={setStationName}
              onSubmit={saveFuel}
              savingLabel="Saving…"
              stationName={stationName}
              submitLabel="Save fuel entry"
            />
          </section>
        </div>
      )}
    </main>
  );
}
