"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Dumbbell, ArrowRight } from "lucide-react";

const apiBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type GymVisit = {
  id: number;
  created_at: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "full",
});

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
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
    <main className="min-h-screen bg-background px-6 py-10 text-foreground sm:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl">
        <Link className="flex items-center gap-1 text-sm font-semibold text-primary transition hover:opacity-80" href="/dashboard">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <p className="mt-5 text-sm font-semibold tracking-[0.18em] text-primary">GYM VISITS</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Your gym history</h1>
        <p className="mt-3 text-base text-muted-foreground">Every visit, ready whenever you want to revisit or complete its workout log.</p>

        <div className="mt-10 space-y-9">
          {isLoading ? (
            <p className="text-muted-foreground">Loading your gym visits…</p>
          ) : error ? (
            <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive" role="alert">{error}</p>
          ) : visitsByDate.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-lg font-semibold text-foreground">No gym visits yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">Mark a gym visit from the dashboard when you&apos;re ready.</p>
            </section>
          ) : (
            visitsByDate.map(([date, dateVisits]) => (
              <section key={date}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-primary">{date}</h2>
                <div className="space-y-3">
                  {dateVisits.map((visit, index) => (
                    <Link
                      className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      href={`/gym-visits/${visit.id}`}
                      key={visit.id}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground" aria-hidden="true">
                          <Dumbbell className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">Gym visit {dateVisits.length > 1 ? `#${dateVisits.length - index}` : ""}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{timeFormatter.format(new Date(visit.created_at))}</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-sm font-semibold text-primary">Open <ArrowRight className="h-4 w-4" /></span>
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
