import React from "react";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import AdminCouponsClient from "./AdminCouponsClient";

export default async function AdminCouponsPage() {
  await requireAdmin();

  let coupons = [];
  try {
    if (adminDb && isFirebaseConfigured) {
      const snapshot = await adminDb.collection("coupons").get();
      const parseDate = (field) => {
        if (!field) return new Date().toISOString();
        if (typeof field.toDate === "function") return field.toDate().toISOString();
        if (field._seconds !== undefined) return new Date(field._seconds * 1000).toISOString();
        if (typeof field === "string") return field;
        return new Date().toISOString();
      };

      const orderSnapshot = await adminDb.collection("orders").get();
      const couponUsageMap = new Map();
      orderSnapshot.docs.forEach(doc => {
        const cCode = doc.data().couponCode;
        if (cCode) {
          const upper = String(cCode).trim().toUpperCase();
          couponUsageMap.set(upper, (couponUsageMap.get(upper) || 0) + 1);
        }
      });

      coupons = snapshot.docs.map(doc => {
        const data = doc.data();
        const codeUpper = (data.code || "").toUpperCase();
        const actualUsed = Math.max(Number(data.usedCount || 0), couponUsageMap.get(codeUpper) || 0);
        const currentRemainingLimit = Number(data.limit || 0);
        const totalGivenLimit = data.initialLimit !== undefined ? Number(data.initialLimit) : (currentRemainingLimit + actualUsed);

        return {
          id: doc.id,
          code: data.code || "",
          discountType: data.discountType || "percentage",
          discountValue: Number(data.discountValue || 0),
          limit: currentRemainingLimit,
          initialLimit: totalGivenLimit,
          usedCount: actualUsed,
          expiryDate: data.expiryDate ? (typeof data.expiryDate.toDate === "function" ? data.expiryDate.toDate().toISOString().split("T")[0] : String(data.expiryDate)) : "",
          createdAt: parseDate(data.createdAt),
        };
      }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
  } catch (error) {
    if (!error.message?.includes("default credentials")) {
      console.error("Failed to fetch coupons:", error.message);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <h1 className="text-3xl font-serif font-bold text-forest mb-6">Manage Coupons</h1>
      <AdminCouponsClient initialCoupons={coupons} />
    </div>
  );
}
