import React from "react";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import AdminOrdersClient from "./AdminOrdersClient";

export default async function AdminOrdersPage() {
  await requireAdmin(); // Secure route

  let pendingOrders = [];
  let historyOrders = [];

  try {
    if (adminDb && isFirebaseConfigured) {
      const pendingSnapshot = await adminDb.collection("orders")
        .where("status", "in", ["Pending", "Accepted", "On the Way"])
        .get();
        
      const rawPending = pendingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      pendingOrders = await Promise.all(rawPending.map(async (order) => {
        let customerName = order.customerName || "";
        let customerPhone = order.customerPhone || "";
        if ((!customerName || customerName === "Customer" || !customerPhone) && order.userId) {
          try {
            const uDoc = await adminDb.collection("users").doc(order.userId).get();
            if (uDoc.exists) {
              const uData = uDoc.data();
              customerName = customerName || uData.displayName || uData.name || "";
              customerPhone = customerPhone || uData.phoneNumber || uData.phone || "";
            }
          } catch (e) {}
        }
        return JSON.parse(JSON.stringify({
          ...order,
          customerName: customerName || "Customer",
          customerPhone: customerPhone || "N/A",
          createdAt: order.createdAt?.toDate ? order.createdAt.toDate().toISOString() : new Date().toISOString(),
          updatedAt: order.updatedAt?.toDate ? order.updatedAt.toDate().toISOString() : (typeof order.updatedAt === 'string' ? order.updatedAt : undefined),
        }));
      }));
      pendingOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      const historySnapshot = await adminDb.collection("orders")
        .where("status", "in", ["Delivered", "Rejected", "Cancelled"])
        .get();
        
      const rawHistory = historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      historyOrders = await Promise.all(rawHistory.map(async (order) => {
        let customerName = order.customerName || "";
        let customerPhone = order.customerPhone || "";
        if ((!customerName || customerName === "Customer" || !customerPhone) && order.userId) {
          try {
            const uDoc = await adminDb.collection("users").doc(order.userId).get();
            if (uDoc.exists) {
              const uData = uDoc.data();
              customerName = customerName || uData.displayName || uData.name || "";
              customerPhone = customerPhone || uData.phoneNumber || uData.phone || "";
            }
          } catch (e) {}
        }
        return JSON.parse(JSON.stringify({
          ...order,
          customerName: customerName || "Customer",
          customerPhone: customerPhone || "N/A",
          createdAt: order.createdAt?.toDate ? order.createdAt.toDate().toISOString() : new Date().toISOString(),
          updatedAt: order.updatedAt?.toDate ? order.updatedAt.toDate().toISOString() : (typeof order.updatedAt === 'string' ? order.updatedAt : undefined),
        }));
      }));
      historyOrders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 50);
    }
  } catch (error) {
    if (!error.message?.includes("default credentials")) {
      console.error("Failed to fetch admin orders:", error.message);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <h1 className="text-3xl font-serif font-bold text-forest mb-6">Manage Orders</h1>
      <AdminOrdersClient initialPending={pendingOrders} initialHistory={historyOrders} />
    </div>
  );
}
