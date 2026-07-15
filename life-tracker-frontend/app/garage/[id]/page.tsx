"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const apiBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
type AirFill = { id: number; filled_at: string };
type FuelItem = { fuel_type: string; fill_type: string; quantity: number; unit_price: number; total_cost: number };
type FuelFill = { id: number; odometer_km: number; filled_at: string; station_name: string | null; notes: string | null; items: FuelItem[] };
const formatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

export default function VehiclePage() {
  const { id } = useParams<{ id: string }>(); const router=useRouter();
  const [airFills,setAirFills]=useState<AirFill[]>([]); const [fuelFills,setFuelFills]=useState<FuelFill[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  useEffect(()=>{async function load(){try{const session=await fetch(`${apiBaseURL}/api/auth/session`,{credentials:"include"});if(!session.ok){router.replace("/");return}const response=await fetch(`${apiBaseURL}/api/vehicles/${id}/history`,{credentials:"include"});if(response.status===404){router.replace("/garage");return}if(!response.ok){setError("We couldn't load this vehicle's history.");return}const data=await response.json() as {air_fills:AirFill[];fuel_fillups:FuelFill[]};setAirFills(data.air_fills);setFuelFills(data.fuel_fillups)}catch{setError("We couldn't reach the server.")}finally{setLoading(false)}}void load()},[id,router]);
  return <main className="min-h-screen bg-[#fffaf3] px-6 py-10 text-stone-800 sm:px-10"><div className="mx-auto max-w-4xl"><Link className="text-sm font-semibold text-amber-800" href="/garage">← Garage</Link><h1 className="mt-6 text-3xl font-bold text-stone-900">Vehicle history</h1>{loading?<p className="mt-8 text-stone-600">Loading history…</p>:error?<p className="mt-8 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>:<div className="mt-8 grid gap-8 lg:grid-cols-2"><section><h2 className="text-xl font-semibold">Fuel fill-ups</h2><div className="mt-4 space-y-3">{fuelFills.length===0?<p className="text-sm text-stone-600">No fuel entries yet.</p>:fuelFills.map(fill=><article className="rounded-2xl bg-white p-5 shadow-sm" key={fill.id}><p className="font-semibold">{fill.odometer_km} km · {formatter.format(new Date(fill.filled_at))}</p>{fill.station_name&&<p className="mt-1 text-sm text-stone-600">{fill.station_name}</p>}{fill.items.map((item,index)=><p className="mt-2 text-sm text-stone-700" key={index}>{item.fuel_type} · {item.fill_type} · {item.quantity} L · ₹{item.total_cost}</p>)}{fill.notes&&<p className="mt-2 text-sm italic text-stone-500">{fill.notes}</p>}</article>)}</div></section><section><h2 className="text-xl font-semibold">Air fills</h2><div className="mt-4 space-y-3">{airFills.length===0?<p className="text-sm text-stone-600">No air fills recorded yet.</p>:airFills.map(fill=><article className="rounded-2xl bg-white p-5 shadow-sm" key={fill.id}>Air filled · {formatter.format(new Date(fill.filled_at))}</article>)}</div></section></div>}</div></main>
}
