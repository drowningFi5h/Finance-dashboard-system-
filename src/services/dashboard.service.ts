import { supabase } from "../lib/supabase.js";
import type { RecordStatus, RecordType } from "../types/domain.js";
import { ApiError } from "../utils/api-error.js";

type SummaryRow = {
  amount: string | number;
  type: RecordType;
  category: string;
  entry_date: string;
};

type RecentRow = {
  id: string;
  amount: string | number;
  type: RecordType;
  category: string;
  entry_date: string;
  notes: string | null;
  status: RecordStatus;
  created_at: string;
};

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function getDashboardSummary() {
  const { data: activeRecords, error: activeError } = await supabase
    .from("financial_records")
    .select("amount,type,category,entry_date")
    .eq("is_deleted", false)
    .eq("status", "active");

  if (activeError) {
    throw new ApiError(500, "Failed to build dashboard summary", "DASHBOARD_SUMMARY_FAILED", activeError.message);
  }

  const records = (activeRecords ?? []) as SummaryRow[];

  let totalIncome = 0;
  let totalExpenses = 0;

  const categoryBuckets: Record<string, { income: number; expenses: number }> = {};
  const monthlyBuckets: Record<string, { income: number; expenses: number }> = {};

  for (const record of records) {
    const amount = toNumber(record.amount);

    if (record.type === "income") {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
    }

    if (!categoryBuckets[record.category]) {
      categoryBuckets[record.category] = { income: 0, expenses: 0 };
    }

    if (record.type === "income") {
      categoryBuckets[record.category].income += amount;
    } else {
      categoryBuckets[record.category].expenses += amount;
    }

    const monthKey = record.entry_date.slice(0, 7);
    if (!monthlyBuckets[monthKey]) {
      monthlyBuckets[monthKey] = { income: 0, expenses: 0 };
    }

    if (record.type === "income") {
      monthlyBuckets[monthKey].income += amount;
    } else {
      monthlyBuckets[monthKey].expenses += amount;
    }
  }

  const categoryTotals = Object.entries(categoryBuckets)
    .map(([category, values]) => ({
      category,
      income: round2(values.income),
      expenses: round2(values.expenses),
      net: round2(values.income - values.expenses)
    }))
    .sort((a, b) => a.category.localeCompare(b.category));

  const monthlyTrends = Object.entries(monthlyBuckets)
    .map(([month, values]) => ({
      month,
      income: round2(values.income),
      expenses: round2(values.expenses),
      net: round2(values.income - values.expenses)
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const { data: recentData, error: recentError } = await supabase
    .from("financial_records")
    .select("id,amount,type,category,entry_date,notes,status,created_at")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(8);

  if (recentError) {
    throw new ApiError(500, "Failed to fetch recent activity", "DASHBOARD_RECENT_FAILED", recentError.message);
  }

  const recentActivity = ((recentData ?? []) as RecentRow[]).map((record) => ({
    id: record.id,
    amount: round2(toNumber(record.amount)),
    type: record.type,
    category: record.category,
    entryDate: record.entry_date,
    notes: record.notes,
    status: record.status,
    createdAt: record.created_at
  }));

  return {
    totals: {
      income: round2(totalIncome),
      expenses: round2(totalExpenses),
      netBalance: round2(totalIncome - totalExpenses)
    },
    categoryTotals,
    monthlyTrends,
    recentActivity
  };
}
