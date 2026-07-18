"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Sun, Moon, Monitor } from "lucide-react";
import ConfirmationDialog from "../components/design-system/confirmation-dialog";

const apiBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type ProfileResponse = {
  has_profile: boolean;
  name?: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark" | "system") || "system";
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const savedTheme = localStorage.getItem("theme") || "system";
      if (savedTheme === "system") {
        if (mediaQuery.matches) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const changeTheme = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (newTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  useEffect(() => {
    document.title = "Profile | Life Tracker";

    async function loadProfile() {
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
      } catch {
        router.replace("/");
      } finally {
        setIsLoading(false);
      }
    }

    void loadProfile();
  }, [router]);

  async function handleLogout() {
    setLogoutError("");
    setIsLoggingOut(true);
    try {
      const response = await fetch(`${apiBaseURL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        setLogoutError("Failed to sign out. Please try again.");
        return;
      }

      // Clear document cookies (in case there are any non-HttpOnly client cookies)
      document.cookie.split(";").forEach((cookie) => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substring(0, eqPos) : cookie;
        document.cookie = name.trim() + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });

      // Clear storage
      localStorage.clear();
      sessionStorage.clear();

      setIsConfirmingLogout(false);
      router.replace("/");
    } catch {
      setLogoutError("Unable to reach the server. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (isLoading || !username) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading profile…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground sm:px-10 lg:px-16">
      <div className="mx-auto max-w-2xl">
        <Link className="flex items-center gap-1 text-sm font-semibold text-primary transition hover:opacity-80 w-fit" href="/dashboard">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>

        <section className="mt-12 flex flex-col items-center text-center">
          {/* Circular Profile Picture Placeholder on top */}
          <div className="relative mb-6">
            <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-card shadow-xl ring-2 ring-primary/20">
              <img
                alt="Profile picture placeholder"
                className="h-full w-full object-cover"
                src="/avatar-placeholder.jpg"
              />
            </div>
          </div>

          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Personal Profile
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {displayName || username}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            @{username}
          </p>

          <div className="mt-10 w-full rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 text-left">
            <h2 className="text-lg font-semibold text-foreground mb-4">Account Information</h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Display Name</span>
                <span className="font-medium text-foreground">{displayName || "Not set"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Username</span>
                <span className="font-medium text-foreground">{username}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 w-full rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 text-left">
            <h2 className="text-lg font-semibold text-foreground mb-1">Theme Settings</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Choose how Life Tracker looks on your device.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => changeTheme("light")}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-sm font-semibold transition cursor-pointer ${
                  theme === "light"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Sun className="h-5 w-5" />
                <span>Light</span>
              </button>
              
              <button
                type="button"
                onClick={() => changeTheme("dark")}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-sm font-semibold transition cursor-pointer ${
                  theme === "dark"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Moon className="h-5 w-5" />
                <span>Dark</span>
              </button>
              
              <button
                type="button"
                onClick={() => changeTheme("system")}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-sm font-semibold transition cursor-pointer ${
                  theme === "system"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Monitor className="h-5 w-5" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Logout Button below all details */}
          <div className="mt-6 w-full">
            <button
              className="flex items-center justify-center gap-2 w-full rounded-lg border border-destructive/30 bg-transparent px-4 py-3 text-sm font-semibold text-destructive transition hover:bg-destructive/10 focus:outline-none focus:ring-4 focus:ring-destructive/20 cursor-pointer"
              onClick={() => {
                setLogoutError("");
                setIsConfirmingLogout(true);
              }}
              type="button"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </section>
      </div>

      <ConfirmationDialog
        isOpen={isConfirmingLogout}
        onClose={() => setIsConfirmingLogout(false)}
        onConfirm={handleLogout}
        title="Sign out of your account?"
        description="You will need to sign in again to access your dashboard and spaces."
        confirmText="Sign out"
        confirmLoadingText="Signing out…"
        isLoading={isLoggingOut}
        error={logoutError}
        variant="destructive"
      />
    </main>
  );
}
