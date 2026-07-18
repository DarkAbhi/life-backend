"use client";

import { useState, useEffect, useTransition } from "react";
import { deleteAirFill, deleteFuelFill } from "./actions";

interface DeleteButtonProps {
  vehicleId: string;
  recordId: number;
  kind: "air-fills" | "fuel-fillups";
}

export default function DeleteButton({ vehicleId, recordId, kind }: DeleteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [toastError, setToastError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toastError) {
      const timer = setTimeout(() => setToastError(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastError]);

  const handleClear = () => {
    startTransition(async () => {
      const action = kind === "air-fills" ? deleteAirFill : deleteFuelFill;
      const res = await action(vehicleId, recordId);
      if (!res.ok) {
        setToastError(res.error ?? "We couldn't delete that record.");
      } else {
        setIsOpen(false);
      }
    });
  };

  return (
    <>
      <button
        className="text-sm font-semibold text-red-700 disabled:opacity-50"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Delete
      </button>

      {/* Confirmation Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 px-6"
          role="dialog"
          aria-labelledby="delete-confirmation-title"
          aria-modal="true"
        >
          <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <h2
              className="text-2xl font-bold tracking-tight text-stone-900"
              id="delete-confirmation-title"
            >
              Delete this record?
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              This will permanently remove this record from your history. This
              cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                className="flex-1 rounded-lg border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
                disabled={isPending}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg bg-red-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300"
                disabled={isPending}
                onClick={handleClear}
                type="button"
              >
                {isPending ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Error Toast Notification */}
      {toastError && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/90 p-4 text-red-900 shadow-xl backdrop-blur-md transition-all duration-300"
          role="alert"
        >
          <span className="text-sm font-medium">{toastError}</span>
          <button
            onClick={() => setToastError("")}
            className="text-red-500 hover:text-red-700 font-bold"
            type="button"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
      )}
    </>
  );
}
