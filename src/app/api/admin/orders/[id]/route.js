import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase/admin";
import { sendNotification } from "@/lib/notifications";

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

    try {
      const orderDoc = await adminDb.collection("orders").doc(orderId).get();
      if (orderDoc.exists) {
        const orderData = orderDoc.data();
        let title = "Order Update";
        let body = `Your order ${orderData.orderId} status is now ${status}.`;

        if (status === "Accepted") title = "Order Accepted";
        else if (status === "Out for Delivery") title = "Order Out for Delivery";
        else if (status === "Delivered") title = "Order Delivered";
        else if (status === "Cancelled" || status === "Rejected") title = "Order Cancelled";
        
        sendNotification({
          userId: orderData.userId,
          title,
          body,
          data: { url: `/orders` }
        }).catch(() => {});
      }
    } catch (e) {
      console.error("Failed to notify user on order update:", e);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Order Update Error:", error);
    if (error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
