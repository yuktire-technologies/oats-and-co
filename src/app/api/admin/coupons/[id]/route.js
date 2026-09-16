import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase/admin";

export async function DELETE(request, context) {
  try {
    await requireAdmin();
    const params = await context.params;
    const couponId = params.id;
    
    await adminDb.collection("coupons").doc(couponId).delete();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Coupon Delete Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
