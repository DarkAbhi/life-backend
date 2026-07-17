"use client";

import Link from "next/link";
import { SubmitEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FuelForm, FuelFormItem } from "../../components/fuel-form";

const apiBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type AirFill = { id: number; filled_at: string };
type FuelItem = { fuel_type: string; fill_type: string; quantity: number; unit_price: number; total_cost: number };
type FuelFill = { id: number; odometer_km: number; filled_at: string; station_name: string | null; notes: string | null; items: FuelItem[] };

const formatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });
const toLocal = (value: string) => new Date(new Date(value).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const toFormItem = (item: FuelItem): FuelFormItem => ({ fuelType: item.fuel_type, fillType: item.fill_type, quantity: String(item.quantity), unitPrice: String(item.unit_price), totalCost: String(item.total_cost) });

export default function VehiclePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [airFills, setAirFills] = useState<AirFill[]>([]);
  const [fuelFills, setFuelFills] = useState<FuelFill[]>([]);
  const [vehicleName, setVehicleName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<FuelFill | null>(null);
  const [saving, setSaving] = useState(false);
  const [odometer, setOdometer] = useState("");
  const [filledAt, setFilledAt] = useState("");
  const [station, setStation] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FuelFormItem[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const session = await fetch(`${apiBaseURL}/api/auth/session`, { credentials: "include" });
        if (!session.ok) { router.replace("/"); return; }
        const response = await fetch(`${apiBaseURL}/api/vehicles/${id}/history`, { credentials: "include" });
        if (response.status === 404) { router.replace("/garage"); return; }
        if (!response.ok) { setError("We couldn't load this vehicle's history."); return; }
        const data = await response.json() as { vehicle_name: string; air_fills: AirFill[]; fuel_fillups: FuelFill[] };
        setVehicleName(data.vehicle_name);
        setAirFills(data.air_fills);
        setFuelFills(data.fuel_fillups);
      } catch { setError("We couldn't reach the server."); } finally { setLoading(false); }
    }
    void load();
  }, [id, router]);

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
    const response = await fetch(`${apiBaseURL}/api/vehicles/${id}/${kind}/${recordID}`, { method: "DELETE", credentials: "include" });
    if (!response.ok) { setError("We couldn't delete that record."); return; }
    if (kind === "air-fills") setAirFills((current) => current.filter((item) => item.id !== recordID));
    else setFuelFills((current) => current.filter((item) => item.id !== recordID));
  }

  async function saveEdit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setError("");
    setSaving(true);
    const optional = (value: string) => value === "" ? null : Number(value);
    const payload = {
      odometer_km: Number(odometer), filled_at: new Date(filledAt).toISOString(), station_name: station || null, notes: notes || null,
      items: items.map((item) => ({ fuel_type: item.fuelType, fill_type: item.fillType, quantity: optional(item.quantity), unit_price: optional(item.unitPrice), total_cost: optional(item.totalCost) })),
    };
    try {
      const response = await fetch(`${apiBaseURL}/api/vehicles/${id}/fuel-fillups/${editing.id}`, { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json() as { error?: string };
      if (!response.ok) { setError(body.error ?? "We couldn't save this fuel entry."); return; }
      setFuelFills((current) => current.map((fill) => fill.id === editing.id ? { ...fill, ...payload, items: payload.items.map((item) => ({ ...item, quantity: item.quantity ?? 0, unit_price: item.unit_price ?? 0, total_cost: item.total_cost ?? 0 })) } : fill));
      setEditing(null);
    } catch { setError("We couldn't reach the server."); } finally { setSaving(false); }
  }

  return <main className="min-h-screen bg-[#fffaf3] px-6 py-10 text-stone-800 sm:px-10"><div className="mx-auto max-w-4xl"><Link className="text-sm font-semibold text-amber-800" href="/garage">← Garage</Link><p className="mt-6 text-sm font-semibold tracking-[0.18em] text-amber-700">VEHICLE HISTORY</p><h1 className="mt-2 text-3xl font-bold text-stone-900">{vehicleName || "Loading vehicle…"}</h1>{loading ? <p className="mt-8">Loading history…</p> : error && !editing ? <p className="mt-8 rounded-xl bg-red-50 p-4 text-red-700">{error}</p> : <div className="mt-8 grid gap-8 lg:grid-cols-2"><section><h2 className="text-xl font-semibold">Fuel fill-ups</h2><div className="mt-4 space-y-3">{fuelFills.length === 0 ? <p className="text-sm text-stone-600">No fuel entries yet.</p> : fuelFills.map((fill) => <article className="rounded-2xl bg-white p-5 shadow-sm" key={fill.id}><div className="flex justify-between gap-3"><p className="font-semibold">{fill.odometer_km} km · {formatter.format(new Date(fill.filled_at))}</p><span className="flex gap-3"><button className="text-sm font-semibold text-amber-800" onClick={() => openEdit(fill)} type="button">Edit</button><button className="text-sm font-semibold text-red-700" onClick={() => void remove("fuel-fillups", fill.id)} type="button">Delete</button></span></div>{fill.station_name && <p className="mt-1 text-sm text-stone-600">{fill.station_name}</p>}{fill.items.map((item, index) => <p className="mt-2 text-sm" key={index}>{item.fuel_type} · {item.fill_type} · {item.quantity} L · ₹{item.total_cost}</p>)}</article>)}</div></section><section><h2 className="text-xl font-semibold">Air fills</h2><div className="mt-4 space-y-3">{airFills.map((fill) => <article className="flex justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm" key={fill.id}><span>Air filled · {formatter.format(new Date(fill.filled_at))}</span><button className="text-sm font-semibold text-red-700" onClick={() => void remove("air-fills", fill.id)} type="button">Delete</button></article>)}</div></section></div>}</div>{editing && <div className="fixed inset-0 z-10 overflow-y-auto bg-stone-950/40 px-6 py-8" role="dialog" aria-labelledby="fuel-title" aria-modal="true"><section className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"><h2 className="text-2xl font-bold tracking-tight text-stone-900" id="fuel-title">Edit fuel fill-up</h2><p className="mt-2 text-sm text-stone-600">Enter any two fuel-cost values; the third is calculated automatically when saved.</p><FuelForm error={error} filledAt={filledAt} isSaving={saving} items={items} notes={notes} odometer={odometer} onCancel={() => setEditing(null)} onFilledAtChange={setFilledAt} onItemsChange={setItems} onNotesChange={setNotes} onOdometerChange={setOdometer} onStationNameChange={setStation} onSubmit={saveEdit} savingLabel="Saving…" stationName={station} submitLabel="Save changes" /></section></div>}</main>;
}
