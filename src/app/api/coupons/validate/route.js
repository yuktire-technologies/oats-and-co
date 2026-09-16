import { NextResponse } from "next/server";
import { adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";

export async function POST(request) {
  try {
    const { code, subTotal = 0 } = await request.json();

    if (!code || !code.trim()) {
      return NextResponse.json({ valid: false, error: "Please enter a coupon code" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    // Fallback if Firebase not configured
    if (!adminDb || !isFirebaseConfigured) {
      if (cleanCode === "HEALTHY20" || cleanCode === "HEALTHY2026") {
        const discountAmount = Math.round(subTotal * 0.2);
        return NextResponse.json({
          valid: true,
          code: cleanCode,
          discountType: "percentage",
          discountValue: 20,
          discountAmount,
          message: "Coupon applied successfully!"
        });
      }
      return NextResponse.json({ valid: false, error: "Invalid coupon code" }, { status: 400 });
    }

    const couponQuery = await adminDb.collection("coupons")
      .where("code", "==", cleanCode)
      .limit(1)
      .get();

    if (couponQuery.empty) {
      return NextResponse.json({ valid: false, error: "Invalid coupon code" }, { status: 400 });
    }

    const coupon = couponQuery.docs[0].data();
    const now = new Date();
    const expiry = coupon.expiryDate ? (coupon.expiryDate.toDate ? coupon.expiryDate.toDate() : new Date(coupon.expiryDate)) : null;

    // Check limit
    if (coupon.limit !== undefined && coupon.limit <= 0) {
      return NextResponse.json({ valid: false, error: "Coupon usage limit reached" }, { status: 400 });
    }

    // Check expiry
    if (expiry && expiry < now) {
      return NextResponse.json({ valid: false, error: "Coupon code has expired" }, { status: 400 });
    }

    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = Math.round(subTotal * (coupon.discountValue / 100));
    } else {
      discountAmount = Math.min(subTotal, Number(coupon.discountValue || 0));
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      message: "Coupon applied successfully!"
    }, { status: 200 });

  } catch (error) {
    console.error("Coupon Validate Error:", error);
    return NextResponse.json({ valid: false, error: error.message || "Failed to validate coupon" }, { status: 500 });
  }
}
