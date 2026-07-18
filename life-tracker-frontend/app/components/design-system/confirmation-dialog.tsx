"use client";

import { useEffect, ReactNode, useId } from "react";

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: ReactNode;
  confirmText: string;
  confirmLoadingText?: string;
  isLoading?: boolean;
  error?: string;
  variant?: "destructive" | "positive" | "amber";
  cancelText?: string;
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  confirmLoadingText,
  isLoading = false,
  error,
  variant = "destructive",
  cancelText = "Cancel",
}: ConfirmationDialogProps) {
  const titleId = useId();

  // Escape key listener to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  // Determine button color classes based on variant
  const buttonColors = {
    destructive: "bg-destructive hover:bg-destructive/90 disabled:bg-destructive/50 text-destructive-foreground focus:ring-destructive/20",
    positive: "bg-emerald-primary hover:bg-emerald-hover disabled:bg-emerald-primary/50 text-white dark:text-stone-950 focus:ring-emerald-ring",
    amber: "bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground focus:ring-ring/20",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-bg px-6 backdrop-blur-xs transition-opacity duration-300"
      onClick={handleBackdropClick}
      role="dialog"
      aria-labelledby={titleId}
      aria-modal="true"
    >
      <section className="w-full max-w-md scale-100 transform rounded-2xl bg-card border border-border p-8 shadow-2xl transition-all duration-300 ease-out">
        <h2
          className="text-2xl font-bold tracking-tight text-foreground"
          id={titleId}
        >
          {title}
        </h2>
        <div className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive animate-pulse" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            className="flex-1 rounded-lg border border-btn-cancel-border bg-btn-cancel-bg px-4 py-3 text-sm font-semibold text-btn-cancel-text transition hover:bg-btn-cancel-hover focus:outline-none focus:ring-4 focus:ring-ring/15 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
            onClick={onClose}
            type="button"
          >
            {cancelText}
          </button>
          <button
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed ${buttonColors[variant]}`}
            disabled={isLoading}
            onClick={onConfirm}
            type="button"
          >
            {isLoading ? confirmLoadingText ?? "Loading…" : confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}
