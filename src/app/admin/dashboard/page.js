import React from "react";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboardPage() {
  await requireAdmin();

  let orders = [];
  let customersCount = 0;

  try {
    if (adminDb && isFirebaseConfigured) {
      const ordersSnapshot = await adminDb.collection("orders").get();
      orders = ordersSnapshot.docs.map(doc => {
        const data = doc.data();
        return JSON.parse(JSON.stringify({
          id: doc.id,
          ...data,
          grandTotal: Number(data.grandTotal ?? data.total ?? data.itemTotal ?? 0),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt ? String(data.createdAt) : new Date().toISOString()),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (typeof data.updatedAt === 'string' ? data.updatedAt : undefined),
        }));
      });

      const usersSnapshot = await adminDb.collection("users").get();
      customersCount = usersSnapshot.size;
    }
  } catch (error) {
    if (!error.message?.includes("default credentials")) {
      console.error("Dashboard metrics error:", error.message);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <h1 className="text-3xl font-serif font-bold text-forest mb-6">Dashboard Overview</h1>
      <AdminDashboardClient initialOrders={orders} initialCustomersCount={customersCount} />
    </div>
  );
}
