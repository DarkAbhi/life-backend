"use client";

import { useState, useEffect, useId } from "react";
import { X, ShoppingBag } from "lucide-react";

export interface PlannedPurchaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; price: number; url: string | null }) => Promise<void> | void;
  currency?: string;
  isPending?: boolean;
}

export default function PlannedPurchaseDialog({
  isOpen,
  onClose,
  onSave,
  currency = "₹",
  isPending = false,
}: PlannedPurchaseDialogProps) {
  const titleId = useId();

  const [purchaseName, setPurchaseName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseURL, setPurchaseURL] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setPurchaseName("");
    setPurchasePrice("");
    setPurchaseURL("");
    setErrorMsg("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isPending]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isPending) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const priceNum = parseFloat(purchasePrice);
    if (!purchaseName.trim()) {
      setErrorMsg("Item name is required.");
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      setErrorMsg("Please enter a valid non-negative price.");
      return;
    }

    try {
      await onSave({
        name: purchaseName.trim(),
        price: priceNum,
        url: purchaseURL.trim() || null,
      });
      onClose();
    } catch {
      setErrorMsg("Failed to save planned purchase.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-xs transition-opacity duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-labelledby={titleId}
      aria-modal="true"
    >
      <div className="w-full max-w-md scale-100 transform rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all duration-200">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <h3 id={titleId} className="text-lg font-bold text-foreground">
              Add Planned Purchase
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Item Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Noise Cancelling Headphones"
              value={purchaseName}
              onChange={(e) => setPurchaseName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Price ({currency}) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Product URL (Optional)</label>
            <input
              type="url"
              placeholder="https://..."
              value={purchaseURL}
              onChange={(e) => setPurchaseURL(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2 text-xs font-semibold text-white shadow transition disabled:opacity-50"
            >
              {isPending ? "Adding…" : "Add Purchase"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
