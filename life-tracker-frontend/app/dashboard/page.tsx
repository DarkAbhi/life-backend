"use client";

import { SubmitEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AppNotification,
  NotificationList,
} from "../components/notification-list";
import ConfirmationDialog from "../components/design-system/confirmation-dialog";

const apiBaseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type ProfileResponse = {
  has_profile: boolean;
  name?: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [needsProfile, setNeedsProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [greeting, setGreeting] = useState("Welcome back");
  const [greetingNote, setGreetingNote] = useState(
    "A fresh start is waiting for you.",
  );
  const [gymVisited, setGymVisited] = useState(false);
  const [gymVisitID, setGymVisitID] = useState<number | null>(null);
  const [isGymLoading, setIsGymLoading] = useState(true);
  const [isMarkingGym, setIsMarkingGym] = useState(false);
  const [gymError, setGymError] = useState("");
  const [isConfirmingAnotherVisit, setIsConfirmingAnotherVisit] =
    useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState("");
  const [purchaseName, setPurchaseName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseURL, setPurchaseURL] = useState("");
  const [isSavingPurchase, setIsSavingPurchase] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good morning");
      setGreetingNote("A gentle start to a wonderful day.");
    } else if (hour < 17) {
      setGreeting("Good afternoon");
      setGreetingNote("Take a moment to check in with your day.");
    } else {
      setGreeting("Good evening");
      setGreetingNote("A quiet moment to reflect on today.");
    }
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const sessionResponse = await fetch(`${apiBaseURL}/api/auth/session`, {
          credentials: "include",
        });
        if (!sessionResponse.ok) {
          router.replace("/");
          return;
        }
        const session = (await sessionResponse.json()) as { username: string };

        const profileResponse = await fetch(`${apiBaseURL}/api/profile`, {
          credentials: "include",
        });
        if (!profileResponse.ok) {
          router.replace("/");
          return;
        }
        const profile = (await profileResponse.json()) as ProfileResponse;
        setUsername(session.username);
        setDisplayName(profile.name ?? "");
        setNeedsProfile(!profile.has_profile);

        const gymResponse = await fetch(`${apiBaseURL}/api/workout/today`, {
          credentials: "include",
        });
        if (!gymResponse.ok) {
          setGymError("We couldn't check today's gym visit.");
          return;
        }
        const gym = (await gymResponse.json()) as {
          visited: boolean;
          id?: number;
        };
        setGymVisited(gym.visited);
        setGymVisitID(gym.id ?? null);
      } catch {
        router.replace("/");
      } finally {
        setIsLoading(false);
        setIsGymLoading(false);
      }
    }

    void loadDashboard();
  }, [router]);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const response = await fetch(
          `${apiBaseURL}/api/notifications?limit=5`,
          {
            credentials: "include",
          },
        );
        if (!response.ok) {
          setNotificationsError("We couldn't load your notifications.");
          return;
        }
        setNotifications((await response.json()) as AppNotification[]);
      } catch {
        setNotificationsError("We couldn't reach the notification center.");
      } finally {
        setIsNotificationsLoading(false);
      }
    }

    void loadNotifications();
  }, []);

  async function saveName(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch(`${apiBaseURL}/api/profile`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName }),
      });
      const body = (await response.json()) as { name?: string; error?: string };
      if (!response.ok) {
        setError(body.error ?? "Unable to save your name.");
        return;
      }
      setDisplayName(body.name ?? displayName);
      setNeedsProfile(false);
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function markGymVisit(): Promise<boolean> {
    setGymError("");
    setIsMarkingGym(true);
    try {
      const response = await fetch(`${apiBaseURL}/api/workout/today`, {
        method: "POST",
        credentials: "include",
      });
      const body = (await response.json()) as { id?: number; error?: string };
      if (!response.ok) {
        setGymError(body.error ?? "We couldn't save your gym visit.");
        return false;
      }
      setGymVisited(true);
      setGymVisitID(body.id ?? null);
      return true;
    } catch {
      setGymError("We couldn't reach the server. Please try again.");
      return false;
    } finally {
      setIsMarkingGym(false);
    }
  }

  async function dismissNotification(notificationID: number) {
    const response = await fetch(
      `${apiBaseURL}/api/notifications/${notificationID}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    if (!response.ok) {
      setNotificationsError(
        "We couldn't dismiss that notification. Please try again.",
      );
      return;
    }
    setNotifications((current) =>
      current.filter((notification) => notification.id !== notificationID),
    );
  }

  async function markGymReminderVisited(notificationID: number) {
    setNotificationsError("");
    try {
      const response = await fetch(
        `${apiBaseURL}/api/notifications/${notificationID}/gym-visit`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!response.ok) {
        setNotificationsError(
          "We couldn't save that gym visit. Please try again.",
        );
        return;
      }
      const body = (await response.json()) as { id: number };
      setGymVisited(true);
      setGymVisitID(body.id);
      setNotifications((current) =>
        current.filter((notification) => notification.id !== notificationID),
      );
    } catch {
      setNotificationsError("We couldn't reach the server. Please try again.");
    }
  }

  async function addNextMonthPurchase(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPurchaseError("");
    setIsSavingPurchase(true);
    try {
      const response = await fetch(`${apiBaseURL}/api/next-month-purchases`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: purchaseName,
          price: Number(purchasePrice),
          url: purchaseURL || null,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setPurchaseError(body.error ?? "We couldn't save that item.");
        return;
      }
      setPurchaseName("");
      setPurchasePrice("");
      setPurchaseURL("");
    } catch {
      setPurchaseError("We couldn't reach the server.");
    } finally {
      setIsSavingPurchase(false);
    }
  }

  if (isLoading || !username) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Loading your dashboard…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fffaf3] px-6 py-10 text-stone-800 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="text-sm font-semibold tracking-[0.18em] text-amber-700">
            LIFE TRACKER
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
            {greeting}, {displayName || username}.
          </h1>
          <p className="mt-3 text-base text-stone-600">{greetingNote}</p>
        </header>

        <section aria-labelledby="categories-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="text-lg font-semibold text-stone-800"
              id="categories-heading"
            >
              Your spaces
            </h2>
            <span className="text-sm text-stone-500">More coming soon</span>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              className="group rounded-2xl border border-amber-100 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-100/70"
              href="/garage"
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-xl"
                aria-hidden="true"
              >
                🚗
              </div>
              <h3 className="mt-5 text-xl font-semibold text-stone-900">
                Garage
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Keep the details of your vehicles close at hand.
              </p>
              <span className="mt-5 inline-flex text-sm font-semibold text-amber-800 transition group-hover:text-amber-950">
                Explore garage →
              </span>
            </Link>
            <article
              className="cursor-pointer rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-100/70"
              onClick={() => router.push("/gym-visits")}
            >
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-xl"
                aria-hidden="true"
              >
                {gymVisited ? "✓" : "🏋️"}
              </div>
              <h3 className="mt-5 text-xl font-semibold text-stone-900">
                Gym visit
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {isGymLoading
                  ? "Checking in on your day…"
                  : gymVisited
                    ? "You showed up for yourself today. Wonderful work."
                    : "A little movement can make a big difference."}
              </p>
              {gymError && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {gymError}
                </p>
              )}
              <button
                className="mt-5 w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
                disabled={isGymLoading || isMarkingGym}
                onClick={(event) => {
                  event.stopPropagation();
                  if (gymVisited) {
                    setIsConfirmingAnotherVisit(true);
                    return;
                  }
                  void markGymVisit();
                }}
                type="button"
              >
                {isMarkingGym
                  ? "Marking your visit…"
                  : gymVisited
                    ? "Mark another gym visit"
                    : "Mark that I visited the gym today"}
              </button>
              {gymVisited && gymVisitID && (
                <Link
                  className="mt-3 block w-full rounded-lg border border-emerald-200 px-4 py-3 text-center text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                  href={`/gym-visits/${gymVisitID}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  Log exercises from this visit →
                </Link>
              )}
            </article>
          </div>
        </section>

        <section className="mt-12" aria-labelledby="notifications-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2
                className="text-lg font-semibold text-stone-800"
                id="notifications-heading"
              >
                Notification center
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Recent updates from your spaces.
              </p>
            </div>
            <Link
              className="shrink-0 text-sm font-semibold text-amber-800 transition hover:text-amber-950"
              href="/notifications"
            >
              View all →
            </Link>
          </div>
          {isNotificationsLoading ? (
            <p className="text-sm text-stone-600">Checking for updates…</p>
          ) : notificationsError ? (
            <p
              className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
              role="alert"
            >
              {notificationsError}
            </p>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-200 bg-white/70 p-7 text-center">
              <p className="font-semibold text-stone-800">
                You&apos;re all caught up.
              </p>
              <p className="mt-1 text-sm text-stone-600">
                Updates from your spaces will appear here.
              </p>
            </div>
          ) : (
            <NotificationList
              notifications={notifications}
              onDismiss={dismissNotification}
              onMarkGymVisited={markGymReminderVisited}
            />
          )}
        </section>

        <section
          className="mt-12 max-w-xl rounded-2xl border border-sky-100 bg-white p-6 shadow-sm"
          aria-labelledby="next-month-heading"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                className="text-lg font-semibold text-stone-800"
                id="next-month-heading"
              >
                Next month purchases
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                A small place for the things you&apos;ll need soon.
              </p>
            </div>
            <Link
              className="shrink-0 text-sm font-semibold text-sky-800"
              href="/next-month"
            >
              View all →
            </Link>
          </div>
          <form
            className="mt-5 grid gap-3 sm:grid-cols-2"
            onSubmit={addNextMonthPurchase}
          >
            <input
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              onChange={(e) => setPurchaseName(e.target.value)}
              placeholder="Item name"
              required
              value={purchaseName}
            />
            <input
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              min="0"
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="Price"
              required
              step="0.01"
              type="number"
              value={purchasePrice}
            />
            <input
              className="sm:col-span-2 rounded-lg border border-stone-300 px-3 py-2 text-sm"
              onChange={(e) => setPurchaseURL(e.target.value)}
              placeholder="Optional URL"
              type="url"
              value={purchaseURL}
            />
            {purchaseError && (
              <p className="sm:col-span-2 text-sm text-red-600" role="alert">
                {purchaseError}
              </p>
            )}
            <button
              className="sm:col-span-2 rounded-lg bg-sky-700 px-4 py-3 text-sm font-semibold text-white disabled:bg-sky-300"
              disabled={isSavingPurchase}
              type="submit"
            >
              {isSavingPurchase ? "Adding…" : "Add for next month"}
            </button>
          </form>
        </section>
      </div>

      {needsProfile && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-slate-950/40 px-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="name-dialog-title"
        >
          <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <h2
              className="text-2xl font-bold tracking-tight"
              id="name-dialog-title"
            >
              What is your name?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              We&apos;ll use it to personalize your dashboard.
            </p>
            <form className="mt-6 space-y-4" onSubmit={saveName}>
              <label
                className="block text-sm font-medium text-slate-700"
                htmlFor="display-name"
              >
                Your name
              </label>
              <input
                autoFocus
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                id="display-name"
                maxLength={120}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                value={displayName}
              />
              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <button
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Saving…" : "Continue"}
              </button>
            </form>
          </section>
        </div>
      )}

      <ConfirmationDialog
        isOpen={isConfirmingAnotherVisit}
        onClose={() => setIsConfirmingAnotherVisit(false)}
        onConfirm={async () => {
          if (await markGymVisit()) {
            setIsConfirmingAnotherVisit(false);
          }
        }}
        title="Mark another gym visit?"
        description="This will create a separate visit for today, with its own exercise log."
        confirmText="Yes, mark visit"
        confirmLoadingText="Marking…"
        isLoading={isMarkingGym}
        variant="positive"
      />
    </main>
  );
}
