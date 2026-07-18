"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const apiBaseURL =
  process.env.NEXT_PUBLIC_INTERNAL_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

async function getAuthHeader() {
  const cookieStore = await cookies();
  return {
    Cookie: cookieStore.toString(),
  };
}

export async function deletePurchase(itemID: number) {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${apiBaseURL}/api/next-month-purchases/${itemID}`, {
      method: "DELETE",
      headers,
    });
    if (!response.ok) {
      return { ok: false, error: "We couldn't delete that purchase. Please try again." };
    }
    revalidatePath("/next-month");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "We couldn't reach the server. Please try again." };
  }
}

export async function clearAllPurchases() {
  try {
    const headers = await getAuthHeader();
    const response = await fetch(`${apiBaseURL}/api/next-month-purchases`, {
      method: "DELETE",
      headers,
    });
    if (!response.ok) {
      return { ok: false, error: "We couldn't clear your planned purchases. Please try again." };
    }
    revalidatePath("/next-month");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "We couldn't reach the server. Please try again." };
  }
}
