"use me"; // standard client component
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Compass,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Home,
  TrendingUp,
  Zap,
  Tv,
  CreditCard,
  Receipt,
  Sparkles,
  PieChart,
  Calendar,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import { HorizonSummary, DeductionItem } from "../dashboard/financial-horizon-card";
import {
  updateHorizonConfigAction,
  addDeductionAction,
  updateDeductionAction,
  deleteDeductionAction,
} from "./actions";

interface FinancialHorizonClientProps {
  initialSummary: HorizonSummary;
}

const CATEGORIES = [
  { id: "housing", label: "Housing & Rent", icon: Home, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { id: "investment", label: "Investments & SIPs", icon: TrendingUp, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { id: "bill", label: "Bills & Utilities", icon: Zap, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { id: "subscription", label: "Subscriptions", icon: Tv, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  { id: "debt", label: "Debt & EMIs", icon: CreditCard, color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  { id: "other", label: "Other Fixed", icon: Receipt, color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
] as const;

export default function FinancialHorizonClient({
  initialSummary,
}: FinancialHorizonClientProps) {
  const [summary, setSummary] = useState<HorizonSummary>(initialSummary);
  const [isEditingBase, setIsEditingBase] = useState(false);
  const [baseInput, setBaseInput] = useState(initialSummary.base_amount.toString());
  const [currencyInput, setCurrencyInput] = useState(initialSummary.currency);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const [isAddingDeduction, setIsAddingDeduction] = useState(false);
  const [editingDeductionId, setEditingDeductionId] = useState<number | null>(null);

  // Form states for Add/Edit deduction
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("housing");
  const [dueDay, setDueDay] = useState<string>("");

  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const getCategoryConfig = (catKey: string) => {
    return (
      CATEGORIES.find((c) => c.id === catKey) ?? {
        id: "other",
        label: "Other Fixed",
        icon: Receipt,
        color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
      }
    );
  };

  const handleSaveBaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const parsedAmount = parseFloat(baseInput);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setErrorMsg("Please enter a valid non-negative base monthly income.");
      return;
    }

    startTransition(async () => {
      const res = await updateHorizonConfigAction(parsedAmount, currencyInput);
      if (res.ok && res.summary) {
        setSummary(res.summary);
        setIsEditingBase(false);
      } else {
        setErrorMsg(res.error ?? "Failed to update starting pool.");
      }
    });
  };

  const handleOpenAddForm = () => {
    setName("");
    setAmount("");
    setCategory("housing");
    setDueDay("");
    setErrorMsg("");
    setIsAddingDeduction(true);
    setEditingDeductionId(null);
  };

  const handleOpenEditForm = (item: DeductionItem) => {
    setName(item.name);
    setAmount(item.amount.toString());
    setCategory(item.category);
    setDueDay(item.due_day ? item.due_day.toString() : "");
    setErrorMsg("");
    setEditingDeductionId(item.id);
    setIsAddingDeduction(false);
  };

  const handleCancelForm = () => {
    setIsAddingDeduction(false);
    setEditingDeductionId(null);
    setErrorMsg("");
  };

  const handleSaveDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    const parsedAmount = parseFloat(amount);
    if (!name.trim()) {
      setErrorMsg("Deduction name is required.");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setErrorMsg("Please enter a valid non-negative amount.");
      return;
    }

    const parsedDueDay = dueDay ? parseInt(dueDay, 10) : null;
    if (parsedDueDay !== null && (parsedDueDay < 1 || parsedDueDay > 31)) {
      setErrorMsg("Due day must be between 1 and 31.");
      return;
    }

    startTransition(async () => {
      if (editingDeductionId !== null) {
        const existing = summary.deductions.find((d) => d.id === editingDeductionId);
        const res = await updateDeductionAction(
          editingDeductionId,
          name,
          category,
          parsedAmount,
          parsedDueDay,
          existing ? existing.is_active : true
        );
        if (res.ok && res.deduction) {
          recalculateSummary((prev) =>
            prev.map((d) => (d.id === editingDeductionId ? res.deduction : d))
          );
          setEditingDeductionId(null);
        } else {
          setErrorMsg(res.error ?? "Failed to update item.");
        }
      } else {
        const res = await addDeductionAction(name, category, parsedAmount, parsedDueDay);
        if (res.ok && res.deduction) {
          recalculateSummary((prev) => [res.deduction, ...prev]);
          setIsAddingDeduction(false);
        } else {
          setErrorMsg(res.error ?? "Failed to add item.");
        }
      }
    });
  };

  const handleToggleActive = (item: DeductionItem) => {
    startTransition(async () => {
      const updatedActive = !item.is_active;
      const res = await updateDeductionAction(
        item.id,
        item.name,
        item.category,
        item.amount,
        item.due_day,
        updatedActive
      );
      if (res.ok && res.deduction) {
        recalculateSummary((prev) =>
          prev.map((d) => (d.id === item.id ? res.deduction : d))
        );
      }
    });
  };

  const handleDeleteDeduction = (id: number) => {
    startTransition(async () => {
      const res = await deleteDeductionAction(id);
      if (res.ok) {
        recalculateSummary((prev) => prev.filter((d) => d.id !== id));
      } else {
        setErrorMsg(res.error ?? "Failed to delete item.");
      }
    });
  };

  const recalculateSummary = (updater: (prev: DeductionItem[]) => DeductionItem[]) => {
    setSummary((prev) => {
      const newDeductions = updater(prev.deductions);
      const totalDeductions = newDeductions
        .filter((d) => d.is_active)
        .reduce((sum, d) => sum + d.amount, 0);
      const remainingAmount = prev.base_amount - totalDeductions;
      const committedRatio =
        prev.base_amount > 0
          ? Math.round((totalDeductions / prev.base_amount) * 10000) / 100
          : 0;

      const projections = [
        { months: 3, label: "3 Months", cumulative_uncommitted: Math.max(0, remainingAmount * 3) },
        { months: 6, label: "6 Months", cumulative_uncommitted: Math.max(0, remainingAmount * 6) },
        { months: 12, label: "1 Year", cumulative_uncommitted: Math.max(0, remainingAmount * 12) },
      ];

      return {
        ...prev,
        total_deductions: totalDeductions,
        remaining_amount: remainingAmount,
        committed_ratio: committedRatio,
        deductions: newDeductions,
        projections,
      };
    });
  };

  const filteredDeductions = summary.deductions.filter((d) =>
    activeCategory === "all" ? true : d.category === activeCategory
  );

  const activeCount = summary.deductions.filter((d) => d.is_active).length;

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl space-y-10">
        {/* Navigation & Header */}
        <div>
          <Link
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition hover:opacity-80"
            href="/dashboard"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Compass className="h-6 w-6" />
                </div>
                <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                  Financial Horizon
                </h1>
              </div>
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                Your month&apos;s starting line calculator. Subtract your non-negotiable fixed obligations from your base income to uncover your exact uncommitted cash flow.
              </p>
            </div>

            <button
              onClick={handleOpenAddForm}
              disabled={isPending}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add Fixed Obligation
            </button>
          </div>
        </div>

        {errorMsg && (
          <div
            className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center justify-between"
            role="alert"
          >
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} className="p-1 hover:opacity-80">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Hero KPI Metrics */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card A: Base Monthly Income */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm relative overflow-hidden transition duration-200 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Base Income (Input A)
              </span>
              <button
                onClick={() => setIsEditingBase(!isEditingBase)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                title="Edit Base Income"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>

            {isEditingBase ? (
              <form onSubmit={handleSaveBaseConfig} className="mt-3 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currencyInput}
                    onChange={(e) => setCurrencyInput(e.target.value)}
                    className="w-12 rounded-lg border border-border bg-background px-2 py-1 text-center text-sm font-bold"
                    placeholder="₹"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={baseInput}
                    onChange={(e) => setBaseInput(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="100000"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditingBase(false)}
                    className="rounded-lg px-2.5 py-1 text-xs font-medium border border-border hover:bg-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-3">
                <p className="text-2xl font-extrabold text-foreground">
                  {summary.currency}
                  {summary.base_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Fixed starting monthly pool
                </p>
              </div>
            )}
          </div>

          {/* Card B: Fixed Obligations */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition duration-200 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Fixed Deductions (Input B)
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {activeCount} active
              </span>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-foreground">
                {summary.currency}
                {summary.total_deductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Recurring non-negotiable expenses
              </p>
            </div>
          </div>

          {/* Card C: Uncommitted Income Pool */}
          <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-emerald-500/5 p-6 shadow-sm transition duration-200 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Uncommitted Pool (Result)
              </span>
              <Sparkles className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-3">
              <p
                className={`text-2xl font-extrabold ${
                  summary.remaining_amount >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {summary.currency}
                {summary.remaining_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Free pool for variable spending & savings
              </p>
            </div>
          </div>

          {/* Card D: Committed Ratio */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm transition duration-200 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Committed Ratio
              </span>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-foreground">
                {summary.committed_ratio.toFixed(1)}%
              </p>
              <div className="mt-2.5 h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    summary.committed_ratio > 80
                      ? "bg-rose-500"
                      : summary.committed_ratio > 50
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, summary.committed_ratio))}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Add/Edit Form Inline Modal */}
        {(isAddingDeduction || editingDeductionId !== null) && (
          <section className="rounded-2xl border border-primary/30 bg-card p-6 shadow-md transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">
                {editingDeductionId !== null ? "Edit Fixed Obligation" : "Add Fixed Obligation"}
              </h3>
              <button
                onClick={handleCancelForm}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeduction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Title / Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apartment Rent, SIP"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Monthly Amount ({summary.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Due Day (1-31, optional)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="e.g. 5"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 shadow"
                >
                  {editingDeductionId !== null ? "Update Obligation" : "Save Obligation"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Obligations List Section */}
        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Fixed Obligations</h2>
              <p className="text-sm text-muted-foreground">
                Non-negotiable monthly expenses subtracted directly from your starting balance.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory("all")}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  activeCategory === "all"
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                All ({summary.deductions.length})
              </button>
              {CATEGORIES.map((cat) => {
                const count = summary.deductions.filter((d) => d.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      activeCategory === cat.id
                        ? "bg-primary text-primary-foreground shadow"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {filteredDeductions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
              <Receipt className="mx-auto h-10 w-10 text-muted-foreground opacity-50" />
              <h3 className="mt-3 text-base font-semibold text-foreground">No fixed obligations found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your rent, SIP investments, bills, or debt EMIs to calculate your exact baseline.
              </p>
              <button
                onClick={handleOpenAddForm}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Add Obligation
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDeductions.map((item) => {
                const catCfg = getCategoryConfig(item.category);
                const IconComponent = catCfg.icon;

                return (
                  <div
                    key={item.id}
                    className={`group relative rounded-2xl border bg-card p-5 shadow-sm transition duration-200 hover:shadow-md ${
                      item.is_active ? "border-border" : "border-border/50 opacity-60 bg-secondary/20"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${catCfg.color}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground text-base leading-tight">
                            {item.name}
                          </h4>
                          <span className="text-xs text-muted-foreground capitalize">
                            {catCfg.label}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleActive(item)}
                        className="text-muted-foreground hover:text-foreground transition"
                        title={item.is_active ? "Deactivate obligation" : "Activate obligation"}
                      >
                        {item.is_active ? (
                          <ToggleRight className="h-6 w-6 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                        )}
                      </button>
                    </div>

                    <div className="mt-4 flex items-baseline justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground">Monthly Amount</span>
                        <p className="text-xl font-bold text-foreground">
                          {summary.currency}
                          {item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      {item.due_day && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/60 px-2 py-1 rounded-lg">
                          <Calendar className="h-3 w-3" />
                          <span>Due {item.due_day}th</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/50 pt-3">
                      <button
                        onClick={() => handleOpenEditForm(item)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                        title="Edit obligation"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDeduction(item.id)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition"
                        title="Delete obligation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Future Horizon Projections Section */}
        <section className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Future Horizon Projections</h2>
              <p className="text-sm text-muted-foreground">
                Projected uncommitted cash pool accumulation based on maintaining your current baseline.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {summary.projections.map((proj) => (
              <div
                key={proj.months}
                className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>{proj.label} Horizon</span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                    {proj.months} Months
                  </span>
                </div>

                <p className="mt-4 text-2xl font-extrabold text-foreground">
                  {summary.currency}
                  {proj.cumulative_uncommitted.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>

                <p className="mt-2 text-xs text-muted-foreground">
                  Estimated uncommitted reserve pool accumulated over {proj.months} months.
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
