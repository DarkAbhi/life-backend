import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import NextMonthClient from "./next-month-client";

const apiBaseURL =
  process.env.NEXT_PUBLIC_INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

type Item = { id: number; name: string; price: number; url: string | null };

export default async function NextMonthPage() {
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

  // Load next-month purchases on the server
  const response = await fetch(`${apiBaseURL}/api/next-month-purchases`, {
    headers: {
      Cookie: cookieHeader,
    },
  });

  if (!response.ok) {
    return (
      <main className="min-h-screen bg-[#fffaf3] px-6 py-10 text-stone-800 sm:px-10">
        <div className="mx-auto max-w-3xl">
          <Link className="text-sm font-semibold text-sky-800" href="/dashboard">← Dashboard</Link>
          <header className="mt-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-stone-900">Next month purchases</h1>
              <p className="mt-2 text-stone-600">Planned total: <span className="font-semibold">₹0.00</span></p>
            </div>
          </header>
          <p className="mt-8 rounded-2xl bg-red-50 p-4 text-sm text-red-700" role="alert">
            We couldn&apos;t load your planned purchases. Please try again.
          </p>
        </div>
      </main>
    );
  }

  const data = (await response.json()) as { items: Item[]; total: number };

  return <NextMonthClient items={data.items} total={data.total} />;
}
