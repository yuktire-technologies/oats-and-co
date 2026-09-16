import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase/admin";

export async function PATCH(request, context) {
  try {
    await requireAdmin();
    const params = await context.params;
    const orderId = params.id;
    const body = await request.json();
    const { status, rejectReason } = body;

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const updateData = { status };
    if (rejectReason) {
      updateData.rejectReason = rejectReason;
    }

    await adminDb.collection("orders").doc(orderId).update(updateData);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Order Update Error:", error);
    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
