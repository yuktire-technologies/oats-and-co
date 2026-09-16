import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";

export async function PATCH(request, context) {
  try {
    await requireAdmin();
    const params = await context.params;
    const userId = params.id;
    const { isBlocked } = await request.json();

    if (typeof isBlocked !== "boolean") {
      return NextResponse.json({ error: "isBlocked boolean required" }, { status: 400 });
    }

    if (adminDb && isFirebaseConfigured) {
      await adminDb.collection("users").doc(userId).set({
        isBlocked,
        updatedAt: new Date(),
      }, { merge: true });
    }

    return NextResponse.json({ success: true, isBlocked }, { status: 200 });
  } catch (error) {
    if (error?.digest?.startsWith("NEXT_REDIRECT") || error?.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Block Customer API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update block status" }, { status: 500 });
  }
}
