"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const apiBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type GymVisit = {
  id: number;
  created_at: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "full",
  timeZone: "Asia/Kolkata",
});

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

export default function GymVisits() {
  const router = useRouter();
  const [visits, setVisits] = useState<GymVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadVisits() {
      try {
        const sessionResponse = await fetch(`${apiBaseURL}/api/auth/session`, {
          credentials: "include",
        });
        if (!sessionResponse.ok) {
          router.replace("/");
          return;
        }

        const response = await fetch(`${apiBaseURL}/api/gym-visits`, {
          credentials: "include",
        });
        if (!response.ok) {
          setError("We couldn't load your gym visits. Please try again.");
          return;
        }
        setVisits((await response.json()) as GymVisit[]);
      } catch {
        setError("We couldn't reach the server. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadVisits();
  }, [router]);

  const visitsByDate = useMemo(() => {
    const grouped = new Map<string, GymVisit[]>();
    for (const visit of visits) {
      const date = new Date(visit.created_at);
      const dateLabel = dateFormatter.format(date);
      grouped.set(dateLabel, [...(grouped.get(dateLabel) ?? []), visit]);
    }
    return [...grouped.entries()];
  }, [visits]);

  return (
    <main className="min-h-screen bg-[#fffaf3] px-6 py-10 text-stone-800 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl">
        <Link className="text-sm font-semibold text-emerald-800 transition hover:text-emerald-950" href="/dashboard">
          ← Dashboard
        </Link>
        <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-emerald-700">GYM VISITS</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">Your gym history</h1>
        <p className="mt-3 text-base text-stone-600">Every visit, ready whenever you want to revisit or complete its workout log.</p>

        <div className="mt-10 space-y-9">
          {isLoading ? (
            <p className="text-stone-600">Loading your gym visits…</p>
          ) : error ? (
            <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>
          ) : visitsByDate.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-10 text-center">
              <p className="text-lg font-semibold text-stone-800">No gym visits yet.</p>
              <p className="mt-2 text-sm text-stone-600">Mark a gym visit from the dashboard when you&apos;re ready.</p>
            </section>
          ) : (
            visitsByDate.map(([date, dateVisits]) => (
              <section key={date}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-emerald-800">{date}</h2>
                <div className="space-y-3">
                  {dateVisits.map((visit, index) => (
                    <Link
                      className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-100/70"
                      href={`/gym-visits/${visit.id}`}
                      key={visit.id}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-lg" aria-hidden="true">🏋️</div>
                        <div>
                          <h3 className="font-semibold text-stone-900">Gym visit {dateVisits.length > 1 ? `#${dateVisits.length - index}` : ""}</h3>
                          <p className="mt-1 text-sm text-stone-500">{timeFormatter.format(new Date(visit.created_at))}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-emerald-800">Open →</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
