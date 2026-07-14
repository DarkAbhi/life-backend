"use client";

import { SubmitEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const apiBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function Home() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    async function redirectIfSignedIn() {
      try {
        const response = await fetch(`${apiBaseURL}/api/auth/session`, {
          credentials: "include",
        });
        if (response.ok) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        // Leave the login form available when the API cannot be reached.
      }
      setIsCheckingSession(false);
    }

    void redirectIfSignedIn();
  }, [router]);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${apiBaseURL}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Unable to sign in. Please try again.");
        return;
      }
      router.replace("/dashboard");
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Checking your session…
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl shadow-slate-200/70 sm:p-10">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold tracking-wide text-indigo-600">
            LIFE TRACKER
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Sign in to continue to your dashboard.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="username"
            >
              Username
            </label>
            <input
              autoComplete="username"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
              id="username"
              name="username"
              defaultValue="admin"
              placeholder="Enter your username"
              required
              type="text"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium text-slate-700"
              htmlFor="password"
            >
              Password
            </label>
            <input
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
              id="password"
              name="password"
              placeholder="Enter your password"
              required
              type="password"
            />
          </div>

          <button
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-indigo-300"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Signing in…" : "Continue"}
          </button>
          {error && <p className="text-center text-sm text-red-600" role="alert">{error}</p>}
        </form>
      </section>
    </main>
  );
}
