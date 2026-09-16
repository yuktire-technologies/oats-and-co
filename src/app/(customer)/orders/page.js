import React from "react";
import { getCurrentUser } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase/admin";
import OrdersClient from "./OrdersClient";

export const dynamic = "force-dynamic";

function normalizePhone(p) {
  if (!p) return "";
  return String(p).replace(/\D/g, "");
}

function phonesMatch(p1, p2) {
  const norm1 = normalizePhone(p1);
  const norm2 = normalizePhone(p2);
  if (!norm1 || !norm2) return false;
  if (norm1 === norm2) return true;
  if (norm1.slice(-10) === norm2.slice(-10) && norm1.length >= 10 && norm2.length >= 10) return true;
  return false;
}

export default async function OrdersPage() {
  const user = await getCurrentUser();
  let orders = [];

  try {
    if (user && user.uid && user.uid !== "user_customer_demo" && adminDb) {
      const targetUid = user.uid;
      const targetPhone = user.phoneNumber;
      const uidOrdersMap = new Map();

      // 1. Fetch by userId
      if (targetUid) {
        const snapshot = await adminDb.collection("orders")
          .where("userId", "==", targetUid)
          .get();

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          uidOrdersMap.set(doc.id, JSON.parse(JSON.stringify({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (typeof data.updatedAt === 'string' ? data.updatedAt : undefined),
          })));
        });
      }

      // 2. Fetch by phone if available
      if (targetPhone) {
        const cleanPhone = normalizePhone(targetPhone);
        const phoneWithPlus = targetPhone.startsWith("+91") ? targetPhone : `+91${cleanPhone}`;
        const phone10 = cleanPhone.slice(-10);

        const queries = [
          adminDb.collection("orders").where("customerPhone", "==", phoneWithPlus).get()
        ];
        if (phone10) {
          queries.push(adminDb.collection("orders").where("customerPhone", "==", phone10).get());
        }

        const phoneSnapshots = await Promise.all(queries);
        phoneSnapshots.forEach(snap => {
          snap.docs?.forEach(doc => {
            if (!uidOrdersMap.has(doc.id)) {
              const data = doc.data();
              uidOrdersMap.set(doc.id, JSON.parse(JSON.stringify({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (typeof data.updatedAt === 'string' ? data.updatedAt : undefined),
              })));
            }
          });
        });
      }

      // STRICT BACKEND SECURITY ENFORCEMENT: Filter to logged-in user only
      orders = Array.from(uidOrdersMap.values()).filter(order => {
        const isOwnerUid = targetUid && order.userId === targetUid;
        const isOwnerPhone = targetPhone && phonesMatch(order.customerPhone, targetPhone);
        return isOwnerUid || isOwnerPhone;
      });

      orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  } catch (error) {
    if (!error.message?.includes("default credentials")) {
      console.error("Failed to fetch orders:", error.message);
    }
  }

  return (
    <div className="min-h-full pb-24 bg-cream">
      <header className="sticky top-0 z-30 bg-ivory shadow-sm border-b border-border-main px-4 py-3 flex items-center">
        <h1 className="text-xl font-serif font-bold text-forest">My Orders</h1>
      </header>
      <div className="p-4 sm:p-6 max-w-lg mx-auto w-full">
        <OrdersClient initialOrders={orders} />
      </div>
    </div>
  );
}
