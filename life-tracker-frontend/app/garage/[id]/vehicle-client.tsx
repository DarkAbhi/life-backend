"use client";

import Link from "next/link";
import { SubmitEvent, useState, useTransition } from "react";
import { FuelForm, FuelFormItem } from "../../components/fuel-form";
import { AirFill, FuelFill, FuelItem } from "./types";
import { deleteAirFill, deleteFuelFill, saveFuelFill } from "./actions";

const formatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const toLocal = (value: string) =>
  new Date(new Date(value).getTime() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

const toFormItem = (item: FuelItem): FuelFormItem => ({
  fuelType: item.fuel_type,
  fillType: item.fill_type,
  quantity: String(item.quantity),
  unitPrice: String(item.unit_price),
  totalCost: String(item.total_cost),
});

interface VehicleClientPageProps {
  id: string;
  initialVehicleName: string;
  initialAirFills: AirFill[];
  initialFuelFills: FuelFill[];
}

export default function VehicleClientPage({
  id,
  initialVehicleName,
  initialAirFills,
  initialFuelFills,
}: VehicleClientPageProps) {
  const [editing, setEditing] = useState<FuelFill | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [odometer, setOdometer] = useState("");
  const [filledAt, setFilledAt] = useState("");
  const [station, setStation] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FuelFormItem[]>([]);

  function openEdit(fill: FuelFill) {
    setError("");
    setEditing(fill);
    setOdometer(String(fill.odometer_km));
    setFilledAt(toLocal(fill.filled_at));
    setStation(fill.station_name ?? "");
    setNotes(fill.notes ?? "");
    setItems(fill.items.map(toFormItem));
  }

  async function remove(kind: "air-fills" | "fuel-fillups", recordID: number) {
    if (!window.confirm("Delete this record? This cannot be undone.")) return;
    setError("");
    startTransition(async () => {
      const action = kind === "air-fills" ? deleteAirFill : deleteFuelFill;
      const res = await action(id, recordID);
      if (!res.ok) {
        setError(res.error ?? "We couldn't delete that record.");
      }
      /*
       * NOTE: [useOptimistic] could later be added here to instantly filter out
       * the deleted record from the UI list (initialAirFills/initialFuelFills)
       * before the Server Action revalidation completes on the backend.
       */
    });
  }

  async function saveEdit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setError("");
    
    const optional = (value: string) => (value === "" ? null : Number(value));
    const payload = {
      odometer_km: Number(odometer),
      filled_at: new Date(filledAt).toISOString(),
      station_name: station || null,
      notes: notes || null,
      items: items.map((item) => ({
        fuel_type: item.fuelType,
        fill_type: item.fillType,
        quantity: optional(item.quantity),
        unit_price: optional(item.unitPrice),
        total_cost: optional(item.totalCost),
      })),
    };

    startTransition(async () => {
      const res = await saveFuelFill(id, editing.id, payload);
      if (!res.ok) {
        setError(res.error ?? "We couldn't save this fuel entry.");
        return;
      }
      /*
       * NOTE: [useOptimistic] could later be added here to instantly swap
       * the updated fuel fill-up inside the list before the server revalidation
       * finishes fetching new props.
       */
      setEditing(null);
    });
  }

  return (
    <main className="min-h-screen bg-[#fffaf3] px-6 py-10 text-stone-800 sm:px-10">
      <div className="mx-auto max-w-4xl">
        <Link className="text-sm font-semibold text-amber-800" href="/garage">
          ← Garage
        </Link>
        <p className="mt-6 text-sm font-semibold tracking-[0.18em] text-amber-700">
          VEHICLE HISTORY
        </p>
        <h1 className="mt-2 text-3xl font-bold text-stone-900">
          {initialVehicleName}
        </h1>
        {error && !editing && (
          <p className="mt-8 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>
        )}
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="text-xl font-semibold">Fuel fill-ups</h2>
            <div className="mt-4 space-y-3">
              {initialFuelFills.length === 0 ? (
                <p className="text-sm text-stone-600">No fuel entries yet.</p>
              ) : (
                initialFuelFills.map((fill) => (
                  <article
                    className="rounded-2xl bg-white p-5 shadow-sm"
                    key={fill.id}
                  >
                    <div className="flex justify-between gap-3">
                      <p className="font-semibold" suppressHydrationWarning>
                        {fill.odometer_km} km ·{" "}
                        {formatter.format(new Date(fill.filled_at))}
                      </p>
                      <span className="flex gap-3">
                        <button
                          className="text-sm font-semibold text-amber-800"
                          onClick={() => openEdit(fill)}
                          type="button"
                          disabled={isPending}
                        >
                          Edit
                        </button>
                        <button
                          className="text-sm font-semibold text-red-700"
                          onClick={() => void remove("fuel-fillups", fill.id)}
                          type="button"
                          disabled={isPending}
                        >
                          Delete
                        </button>
                      </span>
                    </div>
                    {fill.station_name && (
                      <p className="mt-1 text-sm text-stone-600">
                        {fill.station_name}
                      </p>
                    )}
                    {fill.items.map((item, index) => (
                      <p className="mt-2 text-sm" key={index}>
                        {item.fuel_type} · {item.fill_type} · {item.quantity} L
                        · ₹{item.total_cost}
                      </p>
                    ))}
                  </article>
                ))
              )}
            </div>
          </section>
          <section>
            <h2 className="text-xl font-semibold">Air fills</h2>
            <div className="mt-4 space-y-3">
              {initialAirFills.map((fill) => (
                <article
                  className="flex justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm"
                  key={fill.id}
                >
                  <span suppressHydrationWarning>
                    Air filled · {formatter.format(new Date(fill.filled_at))}
                  </span>
                  <button
                    className="text-sm font-semibold text-red-700"
                    onClick={() => void remove("air-fills", fill.id)}
                    type="button"
                    disabled={isPending}
                  >
                    Delete
                  </button>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
      {editing && (
        <div
          className="fixed inset-0 z-10 overflow-y-auto bg-stone-950/40 px-6 py-8"
          role="dialog"
          aria-labelledby="fuel-title"
          aria-modal="true"
        >
          <section className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
            <h2
              className="text-2xl font-bold tracking-tight text-stone-900"
              id="fuel-title"
            >
              Edit fuel fill-up
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Enter any two fuel-cost values; the third is calculated
              automatically when saved.
            </p>
            <FuelForm
              error={error}
              filledAt={filledAt}
              isSaving={isPending}
              items={items}
              notes={notes}
              odometer={odometer}
              onCancel={() => setEditing(null)}
              onFilledAtChange={setFilledAt}
              onItemsChange={setItems}
              onNotesChange={setNotes}
              onOdometerChange={setOdometer}
              onStationNameChange={setStation}
              onSubmit={saveEdit}
              savingLabel="Saving…"
              stationName={station}
              submitLabel="Save changes"
            />
          </section>
        </div>
      )}
    </main>
  );
}
