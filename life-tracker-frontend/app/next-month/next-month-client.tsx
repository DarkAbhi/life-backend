"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deletePurchase, clearAllPurchases } from "./actions";
import ConfirmationDialog from "../components/design-system/confirmation-dialog";

type Item = { id: number; name: string; price: number; url: string | null };

interface NextMonthClientProps {
  items: Item[];
  total: number;
}

export default function NextMonthClient({
  items,
  total,
}: NextMonthClientProps) {
  const [isPending, startTransition] = useTransition();
  const [deletingID, setDeletingID] = useState<number | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Item | null>(null);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);
  const [error, setError] = useState("");

  function handleDelete(item: Item) {
    setError("");
    setDeletingID(item.id);
    startTransition(async () => {
      try {
        const res = await deletePurchase(item.id);
        if (!res.ok) {
          setError(
            res.error ?? "We couldn't delete that purchase. Please try again.",
          );
        } else {
          setPurchaseToDelete(null);
        }
      } catch {
        setError("We couldn't reach the server. Please try again.");
      } finally {
        setDeletingID(null);
      }
    });
  }

  function handleClearAll() {
    setError("");
    setIsClearing(true);
    startTransition(async () => {
      try {
        const res = await clearAllPurchases();
        if (!res.ok) {
          setError(
            res.error ??
              "We couldn't clear your planned purchases. Please try again.",
          );
        } else {
          setIsConfirmingClearAll(false);
        }
      } catch {
        setError("We couldn't reach the server. Please try again.");
      } finally {
        setIsClearing(false);
      }
    });
  }

  const isMutationLoading = isPending || deletingID !== null || isClearing;

  return (
    <main className="min-h-screen bg-[#fffaf3] px-6 py-10 text-stone-800 sm:px-10">
      <div className="mx-auto max-w-3xl">
        <Link className="text-sm font-semibold text-sky-800" href="/dashboard">
          ← Dashboard
        </Link>
        <header className="mt-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-stone-900">
              Next month purchases
            </h1>
            <p className="mt-2 text-stone-600">
              Planned total:{" "}
              <span className="font-semibold">₹{total.toFixed(2)}</span>
            </p>
          </div>
          <button
            className="shrink-0 rounded-lg border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
            disabled={isMutationLoading || items.length === 0}
            onClick={() => {
              setError("");
              setIsConfirmingClearAll(true);
            }}
            type="button"
          >
            {isClearing ? "Clearing…" : "Clear all"}
          </button>
        </header>

        {error && !purchaseToDelete && !isConfirmingClearAll && (
          <p
            className="mt-8 rounded-2xl bg-red-50 p-4 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <p className="mt-8 rounded-2xl bg-white p-6">Nothing planned yet.</p>
        ) : (
          <div className="mt-8 space-y-3">
            {items.map((item) => (
              <article
                className="flex items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm"
                key={item.id}
              >
                <div>
                  <h2 className="font-semibold">{item.name}</h2>
                  {item.url && (
                    <a
                      className="mt-1 block text-sm text-sky-700 underline"
                      href={item.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Open link
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <strong>₹{item.price.toFixed(2)}</strong>
                  <button
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-red-300"
                    disabled={isMutationLoading}
                    onClick={() => {
                      setError("");
                      setPurchaseToDelete(item);
                    }}
                    type="button"
                  >
                    {deletingID === item.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={!!purchaseToDelete}
        onClose={() => setPurchaseToDelete(null)}
        onConfirm={() => {
          if (purchaseToDelete) handleDelete(purchaseToDelete);
        }}
        title={purchaseToDelete ? `Delete ${purchaseToDelete.name}?` : ""}
        description="This permanently removes it from your next month purchases."
        confirmText="Delete purchase"
        confirmLoadingText="Deleting…"
        isLoading={deletingID !== null}
        error={error}
        variant="destructive"
      />

      <ConfirmationDialog
        isOpen={isConfirmingClearAll}
        onClose={() => setIsConfirmingClearAll(false)}
        onConfirm={handleClearAll}
        title="Clear all purchases?"
        description={`This permanently removes all ${items.length} planned purchase${items.length === 1 ? "" : "s"}.`}
        confirmText="Clear all"
        confirmLoadingText="Clearing…"
        isLoading={isClearing}
        error={error}
        variant="destructive"
      />
    </main>
  );
}
