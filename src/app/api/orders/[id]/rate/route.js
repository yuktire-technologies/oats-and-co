import { NextResponse } from "next/server";
import { adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth-server";

export async function POST(request, context) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const params = await context.params;
    const orderId = params.id;
    const { rating, reviewText } = await request.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Invalid rating value (1-5 required)" }, { status: 400 });
    }

    if (!adminDb || !isFirebaseConfigured) {
      return NextResponse.json({ success: true, isMock: true }, { status: 200 });
    }

    // Verify order exists
    let customerName = user.name || user.displayName || user.phoneNumber || "Verified Customer";
    let customerPhone = user.phone_number || user.phoneNumber || "";
    let orderNum = orderId;
    let itemsSummary = "";

    // 1. Fetch user profile from DB if name/phone missing
    if (adminDb && user.uid && (!customerName || customerName === "Verified Customer" || !customerPhone)) {
      try {
        const uDoc = await adminDb.collection("users").doc(user.uid).get();
        if (uDoc.exists) {
          const uData = uDoc.data();
          customerName = uData.displayName || uData.name || customerName;
          customerPhone = uData.phoneNumber || uData.phone || customerPhone;
        }
      } catch (e) {}
    }

    // 2. Fetch order document details
    let orderItems = [];
    let itemIds = [];
    const orderDoc = await adminDb.collection("orders").doc(orderId).get();
    if (orderDoc.exists) {
      const orderData = orderDoc.data();
      customerName = orderData.customerName || customerName;
      customerPhone = orderData.customerPhone || orderData.address?.phone || customerPhone;
      orderNum = orderData.orderId || orderId;
      orderItems = orderData.items || [];
      itemIds = orderItems.map(i => i.id).filter(Boolean);
      itemsSummary = orderItems ? orderItems.map(i => `${i.name} x${i.quantity}`).join(", ") : "";

      // Mark order as rated
      await adminDb.collection("orders").doc(orderId).update({
        isRated: true,
        rating,
        reviewText: reviewText || ""
      });
    }

    // Save to reviews collection in Firestore
    const reviewRef = await adminDb.collection("reviews").add({
      orderDocId: orderId,
      orderId: orderNum,
      userId: user.uid,
      customerName,
      customerPhone,
      itemsSummary,
      items: orderItems,
      itemIds,
      rating: Number(rating),
      comment: reviewText || "",
      status: "Pending",
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, id: reviewRef.id }, { status: 200 });
  } catch (error) {
    console.error("Submit Review Error:", error);
    return NextResponse.json({ error: error.message || "Failed to submit review" }, { status: 500 });
  }
}
