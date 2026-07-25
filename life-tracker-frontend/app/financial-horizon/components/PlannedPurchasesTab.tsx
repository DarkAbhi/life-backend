"use client";

import { ShoppingBag, Plus, Trash2, ExternalLink, ArrowUpRight, Sparkles } from "lucide-react";
import { HorizonSummary } from "../../dashboard/financial-horizon-card";
import { NextMonthPurchaseItem } from "../financial-horizon-client";

interface PlannedPurchasesTabProps {
  summary: HorizonSummary;
  purchases: NextMonthPurchaseItem[];
  purchasesTotal: number;
  netRemainingPool: number;
  onOpenAddPurchase: () => void;
  onConfirmDeletePurchase: (item: NextMonthPurchaseItem) => void;
  onConfirmClearAllPurchases: () => void;
  isPending?: boolean;
  isClearingPurchases?: boolean;
}

export default function PlannedPurchasesTab({
  summary,
  purchases,
  purchasesTotal,
  netRemainingPool,
  onOpenAddPurchase,
  onConfirmDeletePurchase,
  onConfirmClearAllPurchases,
  isPending = false,
  isClearingPurchases = false,
}: PlannedPurchasesTabProps) {
  return (
    <div className="space-y-10">
      {/* Planned Purchases Section */}
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-foreground">Next Month Planned Purchases</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Planned variable purchases subtracted directly from your uncommitted pool for next month.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Total Planned: {summary.currency}{purchasesTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>

            <button
              onClick={onOpenAddPurchase}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow transition active:scale-95 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add Planned Purchase
            </button>

            {purchases.length > 0 && (
              <button
                onClick={onConfirmClearAllPurchases}
                disabled={isPending || isClearingPurchases}
                className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear All
              </button>
            )}
          </div>
        </div>

        {/* List of Next Month Purchases */}
        {purchases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background/50 p-10 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-amber-500/50" />
            <h3 className="mt-3 text-base font-semibold text-foreground">No planned purchases added</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
              Planning major buys next month? Add them here to calculate how much surplus pool remains after accounting for them.
            </p>
            <button
              onClick={onOpenAddPurchase}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow"
            >
              <Plus className="h-4 w-4" /> Add Next Month Purchase
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {purchases.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4 shadow-xs transition hover:shadow-md"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-foreground text-sm truncate">{item.name}</h4>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Link <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-foreground text-sm">
                    {summary.currency}{item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    onClick={() => onConfirmDeletePurchase(item)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition"
                    title="Delete purchase"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Detailed Future Horizon Cash Pool Analysis */}
      <section className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Future Cash Pool Horizon Analysis</h2>
            <p className="text-sm text-muted-foreground">
              Deep dive calculation breakdown of your baseline monthly cash pool reserve across multi-month timelines.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {[3, 6, 12].map((months) => {
            const label = months === 12 ? "1 Year Horizon" : `${months} Months Horizon`;
            const grossUncommitted = (summary.base_amount - summary.total_deductions) * months;
            const projectedReserve = Math.max(0, netRemainingPool * months);

            return (
              <div
                key={months}
                className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur-xs transition duration-200 hover:shadow-md space-y-4"
              >
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>{label}</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    {months} Months
                  </span>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">Projected Net Reserve</span>
                  <p className="text-2xl font-extrabold text-foreground mt-0.5">
                    {summary.currency}
                    {projectedReserve.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="border-t border-border/60 pt-3 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Base Uncommitted Pool:</span>
                    <span className="font-semibold text-foreground">
                      {summary.currency}{grossUncommitted.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Planned Purchases Impact:</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      - {summary.currency}{(purchasesTotal * months).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl bg-secondary/40 border border-border p-4 text-xs text-muted-foreground flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-emerald-500 shrink-0" />
          <span>
            Maintaining a positive baseline pool of <strong>{summary.currency}{netRemainingPool.toLocaleString("en-IN")}</strong> each month ensures steady compounding liquidity over the next 12 months.
          </span>
        </div>
      </section>
    </div>
  );
}
