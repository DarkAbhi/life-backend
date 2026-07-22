"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const apiBaseURL =
  process.env.NEXT_PUBLIC_INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

export async function updateHorizonConfigAction(baseAmount: number, currency: string = "₹") {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    const response = await fetch(`${apiBaseURL}/api/horizon/config`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ base_amount: baseAmount, currency }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: body.error ?? "Failed to update monthly base income." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/financial-horizon");
    return { ok: true, summary: body };
  } catch {
    return { ok: false, error: "Unable to reach the server. Please try again." };
  }
}

export async function addDeductionAction(
  name: string,
  category: string,
  amount: number,
  dueDay?: number | null
) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    const response = await fetch(`${apiBaseURL}/api/horizon/deductions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        name,
        category,
        amount,
        due_day: dueDay ?? null,
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: body.error ?? "Failed to add fixed deduction." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/financial-horizon");
    return { ok: true, deduction: body };
  } catch {
    return { ok: false, error: "Unable to reach the server. Please try again." };
  }
}

export async function updateDeductionAction(
  id: number,
  name: string,
  category: string,
  amount: number,
  dueDay?: number | null,
  isActive: boolean = true
) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    const response = await fetch(`${apiBaseURL}/api/horizon/deductions/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        name,
        category,
        amount,
        due_day: dueDay ?? null,
        is_active: isActive,
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: body.error ?? "Failed to update deduction." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/financial-horizon");
    return { ok: true, deduction: body };
  } catch {
    return { ok: false, error: "Unable to reach the server. Please try again." };
  }
}

export async function deleteDeductionAction(id: number) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    const response = await fetch(`${apiBaseURL}/api/horizon/deductions/${id}`, {
      method: "DELETE",
      headers: {
        Cookie: cookieHeader,
      },
    });

    if (!response.ok) {
      return { ok: false, error: "Failed to delete deduction." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/financial-horizon");
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to reach the server. Please try again." };
  }
}

// Next Month Purchases Actions
export async function addNextMonthPurchaseHorizonAction(
  name: string,
  price: number,
  url: string | null
) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    const response = await fetch(`${apiBaseURL}/api/next-month-purchases`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ name, price, url }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: body.error ?? "We couldn't save that item." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/financial-horizon");
    return { ok: true, item: body };
  } catch {
    return { ok: false, error: "We couldn't reach the server." };
  }
}

export async function deleteNextMonthPurchaseAction(itemID: number) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    const response = await fetch(`${apiBaseURL}/api/next-month-purchases/${itemID}`, {
      method: "DELETE",
      headers: {
        Cookie: cookieHeader,
      },
    });

    if (!response.ok) {
      return { ok: false, error: "We couldn't delete that purchase. Please try again." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/financial-horizon");
    return { ok: true };
  } catch {
    return { ok: false, error: "We couldn't reach the server. Please try again." };
  }
}

export async function clearAllNextMonthPurchasesAction() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  try {
    const response = await fetch(`${apiBaseURL}/api/next-month-purchases`, {
      method: "DELETE",
      headers: {
        Cookie: cookieHeader,
      },
    });

    if (!response.ok) {
      return { ok: false, error: "We couldn't clear your planned purchases. Please try again." };
    }

    revalidatePath("/dashboard");
    revalidatePath("/financial-horizon");
    return { ok: true };
  } catch {
    return { ok: false, error: "We couldn't reach the server. Please try again." };
  }
}
