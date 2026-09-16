import React from "react";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import AdminReviewsClient from "./AdminReviewsClient";

export default async function AdminReviewsPage() {
  await requireAdmin();

  let reviews = [];

  try {
    if (adminDb && isFirebaseConfigured) {
      const snapshot = await adminDb.collection("reviews").get();
      const rawReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      reviews = await Promise.all(rawReviews.map(async (review) => {
        let customerName = review.customerName || "";
        let customerPhone = review.customerPhone || "";
        let itemsSummary = review.itemsSummary || "";
        let orderId = review.orderId || "";

        // If orderDocId exists, fetch order details as fallback
        if ((!customerName || customerName === "Customer" || !customerPhone || !itemsSummary) && (review.orderDocId || review.orderId)) {
          try {
            let orderDoc;
            if (review.orderDocId) {
              orderDoc = await adminDb.collection("orders").doc(review.orderDocId).get();
            }
            if ((!orderDoc || !orderDoc.exists) && review.orderId) {
              const q = await adminDb.collection("orders").where("orderId", "==", review.orderId).limit(1).get();
              if (!q.empty) orderDoc = q.docs[0];
            }

            if (orderDoc && orderDoc.exists) {
              const oData = orderDoc.data();
              customerName = customerName || oData.customerName || "";
              customerPhone = customerPhone || oData.customerPhone || "";
              itemsSummary = itemsSummary || (oData.items ? oData.items.map(i => `${i.name} x${i.quantity}`).join(", ") : "");
              orderId = orderId || oData.orderId || "";
            }
          } catch (e) {}
        }

        // If customerPhone is still missing, lookup user document
        if ((!customerName || !customerPhone) && review.userId) {
          try {
            const uDoc = await adminDb.collection("users").doc(review.userId).get();
            if (uDoc.exists) {
              const uData = uDoc.data();
              customerName = customerName || uData.displayName || uData.name || "";
              customerPhone = customerPhone || uData.phoneNumber || uData.phone || "";
            }
          } catch (e) {}
        }

        return {
          ...review,
          customerName: customerName || "Customer",
          customerPhone: customerPhone || "",
          itemsSummary: itemsSummary || "",
          orderId: orderId || review.id,
          createdAt: review.createdAt?.toDate ? review.createdAt.toDate().toISOString() : (review.createdAt ? new Date(review.createdAt).toISOString() : new Date().toISOString()),
          updatedAt: review.updatedAt?.toDate ? review.updatedAt.toDate().toISOString() : (review.updatedAt ? new Date(review.updatedAt).toISOString() : null),
        };
      }));

      reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  } catch (error) {
    if (!error.message?.includes("default credentials")) {
      console.error("Reviews fetch error:", error.message);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <h1 className="text-3xl font-serif font-bold text-forest mb-6">Customer Reviews & Ratings</h1>
      <AdminReviewsClient initialReviews={reviews} />
    </div>
  );
}
