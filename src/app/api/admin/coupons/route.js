import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request) {
  try {
    await requireAdmin();
    const data = await request.json();
    
    // Validate required fields
    if (!data.code || !data.discountType || !data.discountValue || !data.expiryDate || !data.limit) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ success: true, id: `mock_coupon_${Date.now()}`, isMock: true }, { status: 200 });
    }

    const docRef = await adminDb.collection("coupons").add({
      ...data,
      initialLimit: Number(data.limit),
      usedCount: 0,
      expiryDate: new Date(data.expiryDate),
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, id: docRef.id }, { status: 200 });
  } catch (error) {
    console.error("Coupon Create Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
