"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AppNotification, NotificationList } from "../components/notification-list";
import { dismissNotification, markGymVisited, clearAllNotifications } from "./actions";

interface NotificationsClientProps {
  notifications: AppNotification[];
}

export default function NotificationsClient({ notifications }: NotificationsClientProps) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleDismiss(notificationID: number) {
    setError("");
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await dismissNotification(notificationID);
        if (!res.ok) {
          setError(res.error ?? "We couldn't dismiss that notification. Please try again.");
        }
        resolve();
      });
    });
  }

  async function handleMarkGymVisited(notificationID: number) {
    setError("");
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await markGymVisited(notificationID);
        if (!res.ok) {
          setError(res.error ?? "We couldn't save that gym visit. Please try again.");
        }
        resolve();
      });
    });
  }

  function handleClearAll() {
    setError("");
    startTransition(async () => {
      const res = await clearAllNotifications();
      if (!res.ok) {
        setError(res.error ?? "We couldn't clear your notifications. Please try again.");
      }
    });
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
            disabled={isPending || notifications.length === 0}
            onClick={handleClearAll}
            type="button"
          >
            {isPending ? "Clearing…" : "Clear all"}
          </button>
        </header>

        <section className="mt-10" aria-label="All notifications">
          {error ? (
            <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700 mb-4" role="alert">{error}</p>
          ) : null}
          
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-200 bg-white/70 p-10 text-center">
              <p className="text-lg font-semibold text-stone-800">You&apos;re all caught up.</p>
              <p className="mt-2 text-sm text-stone-600">New updates from your life spaces will appear here.</p>
            </div>
          ) : (
            <NotificationList
              notifications={notifications}
              onDismiss={handleDismiss}
              onMarkGymVisited={handleMarkGymVisited}
            />
          )}
        </section>
      </div>
    </main>
  );
}
