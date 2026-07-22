"use client";

import { useState, useTransition } from "react";
import { addNextMonthPurchaseAction } from "./actions";

export default function NextMonthPurchaseForm() {
  const [purchaseName, setPurchaseName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseURL, setPurchaseURL] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const res = await addNextMonthPurchaseAction(
        purchaseName,
        Number(purchasePrice),
        purchaseURL || null
      );
      if (!res.ok) {
        setError(res.error ?? "We couldn't save that item.");
      } else {
        setPurchaseName("");
        setPurchasePrice("");
        setPurchaseURL("");
      }
    });
  }

  return (
    <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
      <input
        className="rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(e) => setPurchaseName(e.target.value)}
        placeholder="Item name"
        required
        value={purchaseName}
      />
      <input
        className="rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        min="0"
        onChange={(e) => setPurchasePrice(e.target.value)}
        placeholder="Price"
        required
        step="0.01"
        type="number"
        value={purchasePrice}
      />
      <input
        className="sm:col-span-2 rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(e) => setPurchaseURL(e.target.value)}
        placeholder="Optional URL"
        type="url"
        value={purchaseURL}
      />
      {error && (
        <p className="sm:col-span-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <button
        className="sm:col-span-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:bg-muted disabled:text-muted-foreground transition hover:bg-primary/90"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Adding…" : "Add for next month"}
      </button>
    </form>
  );
}
