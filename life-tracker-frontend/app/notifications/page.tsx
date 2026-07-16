"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNotification, NotificationList } from "../components/notification-list";

const apiBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadNotifications() {
      try {
        const sessionResponse = await fetch(`${apiBaseURL}/api/auth/session`, { credentials: "include" });
        if (!sessionResponse.ok) {
          router.replace("/");
          return;
        }
        const response = await fetch(`${apiBaseURL}/api/notifications`, { credentials: "include" });
        if (!response.ok) {
          setError("We couldn't load your notifications. Please try again.");
          return;
        }
        setNotifications((await response.json()) as AppNotification[]);
      } catch {
        setError("We couldn't reach the server. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadNotifications();
  }, [router]);

  async function dismissNotification(notificationID: number) {
    const response = await fetch(`${apiBaseURL}/api/notifications/${notificationID}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      setError("We couldn't dismiss that notification. Please try again.");
      return;
    }
    setNotifications((current) => current.filter((notification) => notification.id !== notificationID));
  }

  async function markGymVisited(notificationID: number) {
    setError("");
    try {
      const response = await fetch(`${apiBaseURL}/api/notifications/${notificationID}/gym-visit`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        setError("We couldn't save that gym visit. Please try again.");
        return;
      }
      setNotifications((current) => current.filter((notification) => notification.id !== notificationID));
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
  }

  async function clearAll() {
    setError("");
    setIsClearing(true);
    try {
      const response = await fetch(`${apiBaseURL}/api/notifications`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        setError("We couldn't clear your notifications. Please try again.");
        return;
      }
      setNotifications([]);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf3] px-6 py-10 text-stone-800 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sm font-semibold text-amber-800 transition hover:text-amber-950" href="/dashboard">← Dashboard</Link>
        <header className="mt-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-amber-700">NOTIFICATIONS</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">Notification center</h1>
            <p className="mt-3 text-base text-stone-600">Stay in the loop across every part of your life tracker.</p>
          </div>
          <button
            className="shrink-0 rounded-lg border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
            disabled={isClearing || notifications.length === 0}
            onClick={() => void clearAll()}
            type="button"
          >
            {isClearing ? "Clearing…" : "Clear all"}
          </button>
        </header>

        <section className="mt-10" aria-label="All notifications">
          {isLoading ? (
            <p className="text-stone-600">Loading notifications…</p>
          ) : error ? (
            <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-200 bg-white/70 p-10 text-center">
              <p className="text-lg font-semibold text-stone-800">You&apos;re all caught up.</p>
              <p className="mt-2 text-sm text-stone-600">New updates from your life spaces will appear here.</p>
            </div>
          ) : (
            <NotificationList notifications={notifications} onDismiss={dismissNotification} onMarkGymVisited={markGymVisited} />
          )}
        </section>
      </div>
    </main>
  );
}
