import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";

export async function PATCH(request, context) {
  try {
    await requireAdmin();
    const params = await context.params;
    const reviewId = params.id;
    const { status } = await request.json();

    if (!status || !["Accepted", "Rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    if (adminDb && isFirebaseConfigured) {
      await adminDb.collection("reviews").doc(reviewId).update({
        status,
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Review Status Update Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update review status" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    await requireAdmin();
    const params = await context.params;
    const reviewId = params.id;

    if (adminDb && isFirebaseConfigured) {
      await adminDb.collection("reviews").doc(reviewId).delete();
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Review Delete Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete review" }, { status: 500 });
  }
}
