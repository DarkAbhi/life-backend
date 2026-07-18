import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AirFill, FuelFill } from "./types";
import DeleteButton from "./delete-button";
import EditFuelModal from "./edit-fuel-modal";

const apiBaseURL =
  process.env.NEXT_PUBLIC_INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

const formatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}

export default async function VehiclePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { edit } = await searchParams;
  
  // Forward cookies from incoming request to backend for auth/session validation
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  // Validate session on the server
  const sessionResponse = await fetch(`${apiBaseURL}/api/auth/session`, {
    headers: {
      Cookie: cookieHeader,
    },
  });
  if (!sessionResponse.ok) {
    redirect("/");
  }

  // Load history on the server
  const response = await fetch(`${apiBaseURL}/api/vehicles/${id}/history`, {
    headers: {
      Cookie: cookieHeader,
    },
  });
  
  if (response.status === 404) {
    redirect("/garage");
  }

  if (!response.ok) {
    return (
      <main className="min-h-screen bg-[#fffaf3] px-6 py-10 text-stone-800 sm:px-10">
        <div className="mx-auto max-w-4xl">
          <p className="rounded-xl bg-red-50 p-4 text-red-700">
            We couldn't load this vehicle's history.
          </p>
        </div>
      </main>
    );
  }

  const data = await response.json() as {
    vehicle_name: string;
    air_fills: AirFill[];
    fuel_fillups: FuelFill[];
  };

  const editingFill = edit
    ? data.fuel_fillups.find((fill) => fill.id === Number(edit))
    : null;

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
          {data.vehicle_name}
        </h1>
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="text-xl font-semibold">Fuel fill-ups</h2>
            <div className="mt-4 space-y-3">
              {data.fuel_fillups.length === 0 ? (
                <p className="text-sm text-stone-600">No fuel entries yet.</p>
              ) : (
                data.fuel_fillups.map((fill) => (
                  <article
                    className="rounded-2xl bg-white p-5 shadow-sm"
                    key={fill.id}
                  >
                    <div className="flex justify-between gap-3">
                      <p className="font-semibold" suppressHydrationWarning>
                        {fill.odometer_km} km ·{" "}
                        {formatter.format(new Date(fill.filled_at))}
                      </p>
                      <span className="flex items-center gap-3">
                        <Link
                          className="text-sm font-semibold text-amber-800"
                          href={`/garage/${id}?edit=${fill.id}`}
                        >
                          Edit
                        </Link>
                        <DeleteButton
                          vehicleId={id}
                          recordId={fill.id}
                          kind="fuel-fillups"
                        />
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
              {data.air_fills.map((fill) => (
                <article
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm"
                  key={fill.id}
                >
                  <span suppressHydrationWarning>
                    Air filled · {formatter.format(new Date(fill.filled_at))}
                  </span>
                  <DeleteButton
                    vehicleId={id}
                    recordId={fill.id}
                    kind="air-fills"
                  />
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
      {editingFill && <EditFuelModal vehicleId={id} fill={editingFill} />}
    </main>
  );
}
