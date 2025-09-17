import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date for display
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Format date with time
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Calculate SHA256 hash for document integrity
export async function calculateSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

// Check if effort allocation exceeds 100%
export function checkEffortOverAllocation(
  allocations: { effort: number; startDate: Date; endDate: Date }[],
  newAllocation: { effort: number; startDate: Date; endDate: Date }
): boolean {
  const overlapping = allocations.filter((a) => {
    return (
      (newAllocation.startDate >= a.startDate && newAllocation.startDate <= a.endDate) ||
      (newAllocation.endDate >= a.startDate && newAllocation.endDate <= a.endDate) ||
      (newAllocation.startDate <= a.startDate && newAllocation.endDate >= a.endDate)
    );
  });

  const totalEffort = overlapping.reduce((sum, a) => sum + a.effort, 0) + newAllocation.effort;
  return totalEffort > 100;
}

// Get status badge color class
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    draft: "status-draft",
    ready_submit: "status-draft",
    submitted: "status-submitted",
    pre_review: "status-pre-review",
    mod_requested: "status-modifications",
    resubmitted: "status-submitted",
    exempt: "status-exempt",
    expedited: "status-approved",
    mtg_scheduled: "status-pre-review",
    approved: "status-approved",
    cond_approved: "status-modifications",
    deferred: "status-modifications",
    not_approved: "status-not-approved",
  };
  return statusColors[status] || "status-draft";
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format percentage
export function formatPercentage(value: number): string {
  return `${value}%`;
}