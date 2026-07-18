"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import ConfirmationDialog from "../components/design-system/confirmation-dialog";

const apiBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function LogoutButton() {
  const router = useRouter();
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

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

  return (
    <>
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
    </>
  );
}
