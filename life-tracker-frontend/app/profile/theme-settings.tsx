"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export default function ThemeSettings() {
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

  return (
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
  );
}
