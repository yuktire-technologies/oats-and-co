import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import { sendNotification } from "@/lib/notifications";

export async function POST(request, context) {
  try {
    const user = await getCurrentUser();
    const params = await context.params;
    const orderId = params.id;
    const { cancelReason } = await request.json().catch(() => ({}));

    if (adminDb && isFirebaseConfigured) {
      const docRef = adminDb.collection("orders").doc(orderId);
      const doc = await docRef.get();

      if (doc.exists) {
        const orderData = doc.data();
        const allowedStatuses = ["Pending", "Accepted", "On the Way"];
        if (!allowedStatuses.includes(orderData.status)) {
          return NextResponse.json(
            { error: `Cannot cancel order with status ${orderData.status}` },
            { status: 400 }
          );
        }

        const cancelledBy = user?.name || orderData.customerName || "Customer";
        await docRef.update({
          status: "Cancelled",
          cancelReason: cancelReason || "No reason",
          rejectReason: cancelReason || "Cancelled by customer",
          cancelledBy: cancelledBy,
          updatedAt: new Date()
        });

        const itemNames = orderData.items && orderData.items.length 
          ? orderData.items.map(i => `${i.quantity || 1}x ${i.name}`).join(", ")
          : `Order ${orderData.orderId || ""}`;
        const bodyStr = `${itemNames} for ₹${orderData.grandTotal ?? 0}`;

        sendNotification({
          role: "admin",
          title: "Order Cancelled",
          body: bodyStr,
          data: { url: `/admin/orders` }
        }).catch(() => {});

        return NextResponse.json({ success: true }, { status: 200 });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Cancel Order API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to cancel order" }, { status: 500 });
  }
}
