import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import VehicleClientPage from "./vehicle-client";

import { AirFill, FuelFill } from "./types";

const apiBaseURL =
  process.env.NEXT_PUBLIC_INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VehiclePage({ params }: PageProps) {
  const { id } = await params;
  
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

  return (
    <VehicleClientPage
      id={id}
      initialVehicleName={data.vehicle_name}
      initialAirFills={data.air_fills}
      initialFuelFills={data.fuel_fillups}
    />
  );
}
