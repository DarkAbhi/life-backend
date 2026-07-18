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
    destructive: "bg-red-700 hover:bg-red-800 disabled:bg-red-300 focus:ring-red-100",
    positive: "bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 focus:ring-emerald-100",
    amber: "bg-amber-700 hover:bg-amber-800 disabled:bg-amber-300 focus:ring-amber-100",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-6 backdrop-blur-xs transition-opacity duration-300"
      onClick={handleBackdropClick}
      role="dialog"
      aria-labelledby={titleId}
      aria-modal="true"
    >
      <section className="w-full max-w-md scale-100 transform rounded-2xl bg-white p-8 shadow-2xl transition-all duration-300 ease-out">
        <h2
          className="text-2xl font-bold tracking-tight text-stone-900"
          id={titleId}
        >
          {title}
        </h2>
        <div className="mt-2 text-sm leading-6 text-stone-600">
          {description}
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 animate-pulse" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            className="flex-1 rounded-lg border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 focus:outline-none focus:ring-4 focus:ring-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
            onClick={onClose}
            type="button"
          >
            {cancelText}
          </button>
          <button
            className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold text-white transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed ${buttonColors[variant]}`}
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
