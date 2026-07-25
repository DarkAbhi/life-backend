"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Compass,
  Plus,
  Trash2,
  Edit2,
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
  ExternalLink,
  ShoppingBag,
  ArrowUpRight,
  Target,
  Wallet,
  Clock,
  Tag,
  Filter,
} from "lucide-react";
import ConfirmationDialog from "../components/design-system/confirmation-dialog";
import TransactionDialog from "./transaction-dialog";
import CategoryDialog from "./category-dialog";
import BudgetDialog from "./budget-dialog";
import { HorizonSummary, DeductionItem, BudgetItem, CategoryItem, TransactionItem } from "../dashboard/financial-horizon-card";
import {
  updateHorizonConfigAction,
  addDeductionAction,
  updateDeductionAction,
  deleteDeductionAction,
  addNextMonthPurchaseHorizonAction,
  deleteNextMonthPurchaseAction,
  clearAllNextMonthPurchasesAction,
  addBudgetAction,
  updateBudgetAction,
  deleteBudgetAction,
  addHorizonCategoryAction,
  addTransactionAction,
  updateTransactionAction,
  deleteTransactionAction,
} from "./actions";

export type NextMonthPurchaseItem = {
  id: number;
  name: string;
  price: number;
  url: string | null;
};

interface FinancialHorizonClientProps {
  initialSummary: HorizonSummary;
  initialPurchases: NextMonthPurchaseItem[];
  initialPurchasesTotal: number;
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
  initialPurchases,
  initialPurchasesTotal,
}: FinancialHorizonClientProps) {
  const [summary, setSummary] = useState<HorizonSummary>({
    ...initialSummary,
    budgets: initialSummary.budgets ?? [],
  });
  const [purchases, setPurchases] = useState<NextMonthPurchaseItem[]>(initialPurchases);

  // Edit base income state
  const [isEditingBase, setIsEditingBase] = useState(false);
  const [baseInput, setBaseInput] = useState(initialSummary.base_amount.toString());
  const [currencyInput, setCurrencyInput] = useState(initialSummary.currency);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Budget Form & Dialog State
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<BudgetItem | null>(null);
  const [deletingBudgetId, setDeletingBudgetId] = useState<number | null>(null);

  // Fixed Deduction Form State
  const [isAddingDeduction, setIsAddingDeduction] = useState(false);
  const [editingDeductionId, setEditingDeductionId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("housing");
  const [dueDay, setDueDay] = useState<string>("");
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);

  // Next Month Purchase Add Form state
  const [purchaseName, setPurchaseName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseURL, setPurchaseURL] = useState("");

  // Next Month Purchase Deletion modals
  const [purchaseToDelete, setPurchaseToDelete] = useState<NextMonthPurchaseItem | null>(null);
  const [deletingPurchaseID, setDeletingPurchaseID] = useState<number | null>(null);
  const [isConfirmingClearAll, setIsConfirmingClearAll] = useState(false);
  const [isClearingPurchases, setIsClearingPurchases] = useState(false);

  // Transactions & Categories State
  const [transactions, setTransactions] = useState<TransactionItem[]>(initialSummary.transactions ?? []);
  const [categories, setCategories] = useState<CategoryItem[]>(initialSummary.categories ?? []);
  const [txCategoryFilter, setTxCategoryFilter] = useState<string>("all");

  // Transaction & Category Dialog State
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionItem | null>(null);
  const [txToDelete, setTxToDelete] = useState<TransactionItem | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

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

  // Next month total
  const purchasesTotal = purchases.reduce((sum, item) => sum + item.price, 0);

  // Uncommitted Pool = Base - Fixed Deductions
  const uncommittedPool = summary.base_amount - summary.total_deductions;

  // Net Remaining Pool = Uncommitted Pool - Next Month Purchases Total
  const netRemainingPool = uncommittedPool - purchasesTotal;

  // Committed ratio including fixed deductions & planned purchases
  const totalCommitted = summary.total_deductions + purchasesTotal;
  const totalCommittedRatio =
    summary.base_amount > 0
      ? Math.round((totalCommitted / summary.base_amount) * 10000) / 100
      : 0;

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
        setSummary({
          ...res.summary,
          budgets: res.summary.budgets ?? [],
        });
        setIsEditingBase(false);
      } else {
        setErrorMsg(res.error ?? "Failed to update starting pool.");
      }
    });
  };

  // Budget Handlers
  const handleOpenAddBudgetForm = () => {
    setEditingBudget(null);
    setIsBudgetDialogOpen(true);
  };

  const handleOpenEditBudgetForm = (b: BudgetItem) => {
    setEditingBudget(b);
    setIsBudgetDialogOpen(true);
  };

  const recalculateSummary = ({
    deductionsUpdater,
    transactionsUpdater,
    budgetsUpdater,
  }: {
    deductionsUpdater?: (prev: DeductionItem[]) => DeductionItem[];
    transactionsUpdater?: (prev: TransactionItem[]) => TransactionItem[];
    budgetsUpdater?: (prev: BudgetItem[]) => BudgetItem[];
  } = {}) => {
    let nextTx = transactions;
    if (transactionsUpdater) {
      nextTx = transactionsUpdater(transactions);
      setTransactions(nextTx);
    }

    setSummary((prev) => {
      const newDeductions = deductionsUpdater ? deductionsUpdater(prev.deductions) : prev.deductions;
      const newBudgetsList = budgetsUpdater ? budgetsUpdater(prev.budgets ?? []) : (prev.budgets ?? []);

      const totalDeductions = newDeductions
        .filter((d) => d.is_active)
        .reduce((sum, d) => sum + d.amount, 0);

      const totalBudgetsAllocated = newBudgetsList.reduce((sum, b) => sum + b.allocated_amount, 0);
      const remainingAmount = prev.base_amount - totalDeductions;
      const committedRatio =
        prev.base_amount > 0
          ? Math.round((totalDeductions / prev.base_amount) * 10000) / 100
          : 0;

      // Recalculate budget used amounts from active deductions AND transactions
      const budgetUsedMap: Record<number, number> = {};
      newDeductions.forEach((d) => {
        if (d.is_active && d.budget_id) {
          budgetUsedMap[d.budget_id] = (budgetUsedMap[d.budget_id] ?? 0) + d.amount;
        }
      });

      nextTx.forEach((t) => {
        if (t.budget_id) {
          budgetUsedMap[t.budget_id] = (budgetUsedMap[t.budget_id] ?? 0) + t.amount;
        }
      });

      const updatedBudgets = newBudgetsList.map((b) => {
        const usedAmount = budgetUsedMap[b.id] ?? 0;
        const availableAmount = b.allocated_amount - usedAmount;
        const usagePercentage =
          b.allocated_amount > 0
            ? Math.round((usedAmount / b.allocated_amount) * 10000) / 100
            : 0;
        return {
          ...b,
          used_amount: usedAmount,
          available_amount: availableAmount,
          usage_percentage: usagePercentage,
        };
      });

      return {
        ...prev,
        total_deductions: totalDeductions,
        total_budgets_allocated: totalBudgetsAllocated,
        remaining_amount: remainingAmount,
        committed_ratio: committedRatio,
        deductions: newDeductions,
        budgets: updatedBudgets,
      };
    });
  };

  const handleSaveBudget = async (data: { id?: number; name: string; allocatedAmount: number }) => {
    setErrorMsg("");
    startTransition(async () => {
      if (data.id) {
        const res = await updateBudgetAction(data.id, data.name, data.allocatedAmount);
        if (res.ok && res.budget) {
          recalculateSummary({
            budgetsUpdater: (prev) =>
              prev.map((b) => (b.id === data.id ? res.budget : b)),
          });
          setIsBudgetDialogOpen(false);
          setEditingBudget(null);
        } else {
          setErrorMsg(res.error ?? "Failed to update budget.");
        }
      } else {
        const res = await addBudgetAction(data.name, data.allocatedAmount);
        if (res.ok && res.budget) {
          recalculateSummary({
            budgetsUpdater: (prev) => [...prev, res.budget],
          });
          setIsBudgetDialogOpen(false);
        } else {
          setErrorMsg(res.error ?? "Failed to add budget.");
        }
      }
    });
  };

  const handleDeleteBudget = (id: number) => {
    setErrorMsg("");
    setDeletingBudgetId(id);
    startTransition(async () => {
      const res = await deleteBudgetAction(id);
      if (res.ok) {
        recalculateSummary({
          budgetsUpdater: (prev) => prev.filter((b) => b.id !== id),
          deductionsUpdater: (prev) =>
            prev.map((d) => (d.budget_id === id ? { ...d, budget_id: null } : d)),
          transactionsUpdater: (prev) =>
            prev.map((t) => (t.budget_id === id ? { ...t, budget_id: null, budget_name: null } : t)),
        });
        setBudgetToDelete(null);
      } else {
        setErrorMsg(res.error ?? "Failed to delete budget.");
      }
      setDeletingBudgetId(null);
    });
  };

  // Fixed Obligation Handlers
  const handleOpenAddDeductionForm = () => {
    setName("");
    setAmount("");
    setCategory("housing");
    setDueDay("");
    setSelectedBudgetId(null);
    setErrorMsg("");
    setIsAddingDeduction(true);
    setEditingDeductionId(null);
  };

  const handleOpenEditDeductionForm = (item: DeductionItem) => {
    setName(item.name);
    setAmount(item.amount.toString());
    setCategory(item.category);
    setDueDay(item.due_day ? item.due_day.toString() : "");
    setSelectedBudgetId(item.budget_id ?? null);
    setErrorMsg("");
    setEditingDeductionId(item.id);
    setIsAddingDeduction(false);
  };

  const handleCancelDeductionForm = () => {
    setIsAddingDeduction(false);
    setEditingDeductionId(null);
    setSelectedBudgetId(null);
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
          existing ? existing.is_active : true,
          selectedBudgetId
        );
        if (res.ok && res.deduction) {
          recalculateSummary({
            deductionsUpdater: (prev) =>
              prev.map((d) => (d.id === editingDeductionId ? res.deduction : d)),
          });
          setEditingDeductionId(null);
          setSelectedBudgetId(null);
        } else {
          setErrorMsg(res.error ?? "Failed to update item.");
        }
      } else {
        const res = await addDeductionAction(
          name,
          category,
          parsedAmount,
          parsedDueDay,
          selectedBudgetId
        );
        if (res.ok && res.deduction) {
          recalculateSummary({
            deductionsUpdater: (prev) => [res.deduction, ...prev],
          });
          setIsAddingDeduction(false);
          setSelectedBudgetId(null);
        } else {
          setErrorMsg(res.error ?? "Failed to add item.");
        }
      }
    });
  };

  const handleToggleDeductionActive = (item: DeductionItem) => {
    startTransition(async () => {
      const updatedActive = !item.is_active;
      const res = await updateDeductionAction(
        item.id,
        item.name,
        item.category,
        item.amount,
        item.due_day,
        updatedActive,
        item.budget_id ?? null
      );
      if (res.ok && res.deduction) {
        recalculateSummary({
          deductionsUpdater: (prev) =>
            prev.map((d) => (d.id === item.id ? res.deduction : d)),
        });
      }
    });
  };

  const handleDeleteDeduction = (id: number) => {
    startTransition(async () => {
      const res = await deleteDeductionAction(id);
      if (res.ok) {
        recalculateSummary({
          deductionsUpdater: (prev) => prev.filter((d) => d.id !== id),
        });
      } else {
        setErrorMsg(res.error ?? "Failed to delete item.");
      }
    });
  };

  // Next Month Purchase Handlers
  const handleAddNextMonthPurchase = (e: React.FormEvent) => {
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

    startTransition(async () => {
      const res = await addNextMonthPurchaseHorizonAction(
        purchaseName,
        priceNum,
        purchaseURL || null
      );
      if (res.ok && res.item) {
        setPurchases((prev) => [res.item, ...prev]);
        setPurchaseName("");
        setPurchasePrice("");
        setPurchaseURL("");
      } else {
        setErrorMsg(res.error ?? "Failed to add purchase item.");
      }
    });
  };

  const handleDeletePurchase = (item: NextMonthPurchaseItem) => {
    setErrorMsg("");
    setDeletingPurchaseID(item.id);
    startTransition(async () => {
      const res = await deleteNextMonthPurchaseAction(item.id);
      if (res.ok) {
        setPurchases((prev) => prev.filter((p) => p.id !== item.id));
        setPurchaseToDelete(null);
      } else {
        setErrorMsg(res.error ?? "Failed to delete purchase.");
      }
      setDeletingPurchaseID(null);
    });
  };

  const handleClearAllPurchases = () => {
    setErrorMsg("");
    setIsClearingPurchases(true);
    startTransition(async () => {
      const res = await clearAllNextMonthPurchasesAction();
      if (res.ok) {
        setPurchases([]);
        setIsConfirmingClearAll(false);
      } else {
        setErrorMsg(res.error ?? "Failed to clear purchases.");
      }
      setIsClearingPurchases(false);
    });
  };

  // Transaction & Category Handlers
  const handleOpenAddTransaction = () => {
    setEditingTransaction(null);
    setIsTransactionDialogOpen(true);
  };

  const handleOpenEditTransaction = (tx: TransactionItem) => {
    setEditingTransaction(tx);
    setIsTransactionDialogOpen(true);
  };

  const handleSaveTransaction = async (data: {
    id?: number;
    name: string;
    amount: number;
    transactionDate: string;
    categoryId?: number | null;
    budgetId?: number | null;
    notes?: string | null;
  }) => {
    setErrorMsg("");
    startTransition(async () => {
      if (data.id) {
        const res = await updateTransactionAction(
          data.id,
          data.name,
          data.amount,
          data.transactionDate,
          data.categoryId,
          data.budgetId,
          data.notes
        );
        if (res.ok && res.transaction) {
          recalculateSummary({
            transactionsUpdater: (prev) =>
              prev.map((t) => (t.id === data.id ? res.transaction : t)),
          });
          setIsTransactionDialogOpen(false);
          setEditingTransaction(null);
        } else {
          setErrorMsg(res.error ?? "Failed to update transaction.");
        }
      } else {
        const res = await addTransactionAction(
          data.name,
          data.amount,
          data.transactionDate,
          data.categoryId,
          data.budgetId,
          data.notes
        );
        if (res.ok && res.transaction) {
          recalculateSummary({
            transactionsUpdater: (prev) => [res.transaction, ...prev],
          });
          setIsTransactionDialogOpen(false);
        } else {
          setErrorMsg(res.error ?? "Failed to add transaction.");
        }
      }
    });
  };

  const handleDeleteTransaction = () => {
    if (!txToDelete) return;
    setErrorMsg("");
    startTransition(async () => {
      const res = await deleteTransactionAction(txToDelete.id);
      if (res.ok) {
        recalculateSummary({
          transactionsUpdater: (prev) => prev.filter((t) => t.id !== txToDelete.id),
        });
        setTxToDelete(null);
      } else {
        setErrorMsg(res.error ?? "Failed to delete transaction.");
      }
    });
  };

  const handleSaveCategory = async (data: { name: string; color: string }) => {
    setErrorMsg("");
    startTransition(async () => {
      const res = await addHorizonCategoryAction(data.name, "tag", data.color);
      if (res.ok && res.category) {
        setCategories((prev) => [...prev, res.category]);
        setIsCategoryDialogOpen(false);
      } else {
        setErrorMsg(res.error ?? "Failed to add category.");
      }
    });
  };

  const filteredDeductions = summary.deductions.filter((d) =>
    activeCategory === "all" ? true : d.category === activeCategory
  );

  const activeDeductionsCount = summary.deductions.filter((d) => d.is_active).length;

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
                Your month&apos;s starting line calculator. Manages monthly budgets, subtracts fixed obligations and planned purchases from base income to reveal your exact net uncommitted cash pool.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleOpenAddBudgetForm}
                disabled={isPending}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/20 active:scale-95 disabled:opacity-50"
              >
                <Target className="h-4 w-4" /> Add Monthly Budget
              </button>

              <button
                onClick={handleOpenAddDeductionForm}
                disabled={isPending}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Add Fixed Obligation
              </button>
            </div>
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

        {/* Hero KPI Metrics Cards */}
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {/* Card 1: Base Monthly Income (Input A) */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm relative overflow-hidden transition duration-200 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Base Income (A)
              </span>
              <button
                onClick={() => setIsEditingBase(!isEditingBase)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                title="Edit Base Income"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {isEditingBase ? (
              <form onSubmit={handleSaveBaseConfig} className="mt-2 space-y-2">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={currencyInput}
                    onChange={(e) => setCurrencyInput(e.target.value)}
                    className="w-10 rounded-lg border border-border bg-background px-1.5 py-1 text-center text-xs font-bold"
                    placeholder="₹"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={baseInput}
                    onChange={(e) => setBaseInput(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="100000"
                    autoFocus
                  />
                </div>
                <div className="flex gap-1.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditingBase(false)}
                    className="rounded-lg px-2 py-0.5 text-xs font-medium border border-border hover:bg-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-lg bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-2.5">
                <p className="text-xl font-extrabold text-foreground">
                  {summary.currency}
                  {summary.base_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">Starting monthly pool</p>
              </div>
            )}
          </div>

          {/* Card 2: Fixed Deductions (Input B) */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition duration-200 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Fixed Obligations (B)
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {activeDeductionsCount} active
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-extrabold text-foreground">
                {summary.currency}
                {summary.total_deductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Non-negotiable fixed bills</p>
            </div>
          </div>

          {/* Card 3: Next Month Purchases (Input C) */}
          <div className="rounded-2xl border border-border bg-amber-500/5 p-5 shadow-sm transition duration-200 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Next Month Purchases (C)
              </span>
              <ShoppingBag className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                {summary.currency}
                {purchasesTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {purchases.length} planned purchase{purchases.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {/* Card 4: Net Uncommitted Pool (Result: A - B - C) */}
          <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-emerald-500/10 p-5 shadow-sm transition duration-200 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Net Available Pool (A-B-C)
              </span>
              <Sparkles className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2.5">
              <p
                className={`text-xl font-extrabold ${
                  netRemainingPool >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {summary.currency}
                {netRemainingPool.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Net cash after all obligations</p>
            </div>
          </div>

          {/* Card 5: Total Allocated / Budgeted */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition duration-200 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Budgeted
              </span>
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-extrabold text-foreground">
                {summary.currency}
                {(summary.total_budgets_allocated ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{summary.budgets?.length ?? 0} active budget{(summary.budgets?.length ?? 0) === 1 ? "" : "s"}</span>
                <span>{totalCommittedRatio.toFixed(1)}% committed</span>
              </div>
            </div>
          </div>
        </section>

        {/* Monthly Budgets Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Monthly Budgets</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  1st – End of Month
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Set monthly spending allocations. Assigning fixed obligations automatically deducts from your available budget balance.
              </p>
            </div>

            <button
              onClick={handleOpenAddBudgetForm}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20"
            >
              <Plus className="h-4 w-4" /> Add Budget
            </button>
          </div>

          {(summary.budgets ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
              <Target className="mx-auto h-10 w-10 text-muted-foreground opacity-50" />
              <h3 className="mt-3 text-base font-semibold text-foreground">No monthly budgets configured</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                Create monthly budgets (e.g. Housing, Utilities, SIPs) to track allocations and link your fixed obligations.
              </p>
              <button
                onClick={handleOpenAddBudgetForm}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Add Your First Budget
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(summary.budgets ?? []).map((b) => {
                const linkedDeductions = summary.deductions.filter((d) => d.budget_id === b.id);
                const isOverBudget = b.available_amount < 0;
                const pct = Math.min(100, Math.max(0, b.usage_percentage));

                return (
                  <div
                    key={b.id}
                    className="group relative rounded-2xl border border-border bg-card p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Wallet className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-foreground text-base leading-tight">{b.name}</h4>
                            <span className="text-xs text-muted-foreground">
                              {linkedDeductions.length} linked obligation{linkedDeductions.length === 1 ? "" : "s"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditBudgetForm(b)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                            title="Edit Budget"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setBudgetToDelete(b)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition"
                            title="Delete Budget"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Amounts Display */}
                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-secondary/30 p-3">
                        <div>
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Allocated</span>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            {summary.currency}{b.allocated_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Committed/Used</span>
                          <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                            {summary.currency}{b.used_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Usage Progress Bar */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-medium">Available Balance</span>
                          <span
                            className={`font-bold ${
                              isOverBudget ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {summary.currency}{b.available_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              isOverBudget ? "bg-rose-500" : pct > 80 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-end">
                          <span className="text-[11px] text-muted-foreground font-semibold">
                            {b.usage_percentage.toFixed(1)}% committed
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Linked items chips */}
                    {linkedDeductions.length > 0 && (
                      <div className="mt-4 border-t border-border/50 pt-3">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase">Linked Obligations:</span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {linkedDeductions.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center gap-1 rounded-md bg-background border border-border px-2 py-0.5 text-[11px] font-medium text-foreground"
                            >
                              {item.name} ({summary.currency}{item.amount})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Next Month Purchases Management Section */}
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

              {purchases.length > 0 && (
                <button
                  onClick={() => setIsConfirmingClearAll(true)}
                  disabled={isPending || isClearingPurchases}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear All
                </button>
              )}
            </div>
          </div>

          {/* Add Next Month Purchase Form */}
          <form onSubmit={handleAddNextMonthPurchase} className="grid gap-3 sm:grid-cols-3">
            <input
              type="text"
              required
              placeholder="Item name (e.g. Headphones)"
              value={purchaseName}
              onChange={(e) => setPurchaseName(e.target.value)}
              className="rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              required
              placeholder={`Price (${summary.currency})`}
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="url"
              placeholder="Optional URL (https://...)"
              value={purchaseURL}
              onChange={(e) => setPurchaseURL(e.target.value)}
              className="rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={isPending}
              className="sm:col-span-3 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add Next Month Purchase
            </button>
          </form>

          {/* List of Next Month Purchases */}
          {purchases.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/50 p-6 text-center text-sm text-muted-foreground">
              No planned purchases added for next month yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {purchases.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:shadow-md"
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
                      onClick={() => setPurchaseToDelete(item)}
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

        {/* Transactions Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Transactions</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {transactions.length} Logged
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Log day-to-day transaction records with date & time, category, and optional budget allocations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCategoryDialogOpen(true)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary"
              >
                <Tag className="h-3.5 w-3.5 text-muted-foreground" /> Add Category
              </button>
              <button
                onClick={handleOpenAddTransaction}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow transition hover:opacity-90 active:scale-95"
              >
                <Plus className="h-4 w-4" /> Add Transaction
              </button>
            </div>
          </div>

          {/* Categories Pill List */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setTxCategoryFilter("all")}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                txCategoryFilter === "all"
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => {
              const count = transactions.filter((t) => t.category_id === cat.id || t.category_name === cat.name).length;
              const isSelected = txCategoryFilter === cat.name;
              return (
                <button
                  key={cat.id}
                  onClick={() => setTxCategoryFilter(isSelected ? "all" : cat.name)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition border ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border/60 bg-card text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: cat.color || "#64748b" }}
                  />
                  <span>{cat.name}</span>
                  {count > 0 && (
                    <span className="ml-0.5 rounded-md bg-secondary px-1.5 py-0.2 text-[10px] font-bold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Transactions List */}
          {transactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
              <Receipt className="mx-auto h-10 w-10 text-muted-foreground opacity-50" />
              <h3 className="mt-3 text-base font-semibold text-foreground">No transactions recorded yet</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                Log your financial transactions to track actual spending against pre-filled categories and monthly budgets.
              </p>
              <button
                onClick={handleOpenAddTransaction}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Log First Transaction
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions
                .filter((t) => txCategoryFilter === "all" || t.category_name === txCategoryFilter)
                .map((tx) => {
                  const matchingCat = categories.find((c) => c.id === tx.category_id || c.name === tx.category_name);
                  const catColor = matchingCat?.color || "#64748b";

                  const formattedDate = tx.transaction_date
                    ? new Date(tx.transaction_date).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "N/A";

                  return (
                    <div
                      key={tx.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold shadow-xs mt-0.5 sm:mt-0"
                          style={{ backgroundColor: catColor }}
                        >
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-foreground text-base truncate">{tx.name}</h4>
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border"
                              style={{
                                backgroundColor: `${catColor}15`,
                                color: catColor,
                                borderColor: `${catColor}30`,
                              }}
                            >
                              {tx.category_name}
                            </span>
                            {tx.budget_name && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary">
                                <Wallet className="h-3 w-3" /> {tx.budget_name}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1" suppressHydrationWarning>
                              <Clock className="h-3.5 w-3.5" /> {formattedDate}
                            </span>
                            {tx.notes && <span className="truncate italic max-w-xs">&quot;{tx.notes}&quot;</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <span className="font-extrabold text-foreground text-lg" suppressHydrationWarning>
                          {summary.currency}{tx.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditTransaction(tx)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                            title="Edit transaction"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setTxToDelete(tx)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition"
                            title="Delete transaction"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>



        {/* Add/Edit Deduction Modal / Form */}
        {(isAddingDeduction || editingDeductionId !== null) && (
          <section className="rounded-2xl border border-primary/30 bg-card p-6 shadow-md transition duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">
                {editingDeductionId !== null ? "Edit Fixed Obligation" : "Add Fixed Obligation"}
              </h3>
              <button
                onClick={handleCancelDeductionForm}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeduction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

              <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Link to Monthly Budget (Optional)</label>
                <select
                  value={selectedBudgetId ?? ""}
                  onChange={(e) => setSelectedBudgetId(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- No Budget Link --</option>
                  {(summary.budgets ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({summary.currency}{b.allocated_amount.toLocaleString("en-IN")})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelDeductionForm}
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

        {/* Fixed Obligations List Section */}
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
                onClick={handleOpenAddDeductionForm}
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
                const linkedBudget = summary.budgets?.find((b) => b.id === item.budget_id);

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
                        onClick={() => handleToggleDeductionActive(item)}
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

                    {linkedBudget && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                        <Target className="h-3.5 w-3.5" />
                        <span>Budget: <strong>{linkedBudget.name}</strong></span>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/50 pt-3">
                      <button
                        onClick={() => handleOpenEditDeductionForm(item)}
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
                Projected uncommitted cash pool accumulation based on maintaining your baseline uncommitted cash flow.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {[3, 6, 12].map((months) => {
              const label = months === 12 ? "1 Year" : `${months} Months`;
              const projectedReserve = Math.max(0, netRemainingPool * months);

              return (
                <div
                  key={months}
                  className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm backdrop-blur-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>{label} Horizon</span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      {months} Months
                    </span>
                  </div>

                  <p className="mt-4 text-2xl font-extrabold text-foreground">
                    {summary.currency}
                    {projectedReserve.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>

                  <p className="mt-2 text-xs text-muted-foreground">
                    Estimated net uncommitted reserve pool accumulated over {months} months.
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Confirmation Dialog for Budget Deletion */}
      <ConfirmationDialog
        isOpen={!!budgetToDelete}
        onClose={() => setBudgetToDelete(null)}
        onConfirm={() => {
          if (budgetToDelete) handleDeleteBudget(budgetToDelete.id);
        }}
        title={budgetToDelete ? `Delete ${budgetToDelete.name}?` : ""}
        description="This will permanently delete this monthly budget. Any linked obligations will remain intact but become unbudgeted."
        confirmText="Delete budget"
        confirmLoadingText="Deleting…"
        isLoading={deletingBudgetId !== null}
        error={errorMsg}
        variant="destructive"
      />

      {/* Confirmation Dialogs for Purchase Deletions */}
      <ConfirmationDialog
        isOpen={!!purchaseToDelete}
        onClose={() => setPurchaseToDelete(null)}
        onConfirm={() => {
          if (purchaseToDelete) handleDeletePurchase(purchaseToDelete);
        }}
        title={purchaseToDelete ? `Delete ${purchaseToDelete.name}?` : ""}
        description="This permanently removes it from your next month purchases."
        confirmText="Delete purchase"
        confirmLoadingText="Deleting…"
        isLoading={deletingPurchaseID !== null}
        error={errorMsg}
        variant="destructive"
      />

      <ConfirmationDialog
        isOpen={isConfirmingClearAll}
        onClose={() => setIsConfirmingClearAll(false)}
        onConfirm={handleClearAllPurchases}
        title="Clear all next month purchases?"
        description={`This permanently removes all ${purchases.length} planned purchase${purchases.length === 1 ? "" : "s"}.`}
        confirmText="Clear all"
        confirmLoadingText="Clearing…"
        isLoading={isClearingPurchases}
        error={errorMsg}
        variant="destructive"
      />

      {/* Confirmation Dialog for Transaction Deletion */}
      <ConfirmationDialog
        isOpen={!!txToDelete}
        onClose={() => setTxToDelete(null)}
        onConfirm={handleDeleteTransaction}
        title={txToDelete ? `Delete "${txToDelete.name}"?` : ""}
        description="This will permanently delete this transaction record."
        confirmText="Delete transaction"
        confirmLoadingText="Deleting…"
        isLoading={isPending}
        error={errorMsg}
        variant="destructive"
      />

      {/* Transaction Entry Dialog */}
      <TransactionDialog
        isOpen={isTransactionDialogOpen}
        onClose={() => {
          setIsTransactionDialogOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        editingTransaction={editingTransaction}
        categories={categories}
        budgets={summary.budgets ?? []}
        currency={summary.currency}
        isPending={isPending}
      />

      {/* Category Entry Dialog */}
      <CategoryDialog
        isOpen={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        onSave={handleSaveCategory}
        isPending={isPending}
      />

      {/* Budget Entry Dialog */}
      <BudgetDialog
        isOpen={isBudgetDialogOpen}
        onClose={() => {
          setIsBudgetDialogOpen(false);
          setEditingBudget(null);
        }}
        onSave={handleSaveBudget}
        editingBudget={editingBudget}
        currency={summary.currency}
        isPending={isPending}
      />
    </main>
  );
}
