import React from "react";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import AdminCustomersClient from "./AdminCustomersClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizePhone(phone) {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export default async function AdminCustomersPage() {
  await requireAdmin();

  let customers = [];

  try {
    if (adminDb && isFirebaseConfigured) {
      const userSnapshot = await adminDb.collection("users").get();
      const orderSnapshot = await adminDb.collection("orders").get();

      const userMap = new Map();
      const phoneToUserKey = new Map();

      // 1. Index existing users from users collection
      userSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const rawPhone = data.phoneNumber || data.phone || data.mobile || data.phone_number || (doc.id.replace(/\D/g, "").length >= 10 ? doc.id : "");
        const normPhone = normalizePhone(rawPhone);

        let createdIso = null;
        if (data.createdAt) {
          if (typeof data.createdAt.toDate === "function") {
            createdIso = data.createdAt.toDate().toISOString();
          } else {
            const parsed = new Date(data.createdAt);
            if (!isNaN(parsed.getTime())) createdIso = parsed.toISOString();
          }
        }

        const userObj = {
          id: doc.id,
          displayName: data.displayName || data.name || "Healthy Foodie",
          phoneNumber: rawPhone || "N/A",
          role: data.role || "Customer",
          isBlocked: Boolean(data.isBlocked),
          delivered: 0,
          pending: 0,
          rejected: 0,
          cancelled: 0,
          totalOrders: 0,
          createdAt: createdIso,
        };

        userMap.set(doc.id, userObj);
        if (normPhone) {
          phoneToUserKey.set(normPhone, doc.id);
        }
      });

      // 2. Process all orders and update user statistics
      orderSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const userId = data.userId;
        const rawPhone = data.customerPhone || data.userPhone || data.phone || data.phoneNumber || data.mobile || data.customerMobile || "";
        const normPhone = normalizePhone(rawPhone);

        // Find user by normalized phone first, or by userId
        let userObj = null;
        if (normPhone && phoneToUserKey.has(normPhone)) {
          userObj = userMap.get(phoneToUserKey.get(normPhone));
        } else if (userId && userMap.has(userId)) {
          userObj = userMap.get(userId);
        }

        // If user not found in userMap, create a new record for order-only customer
        if (!userObj) {
          const key = userId || (normPhone ? `phone_${normPhone}` : doc.id);
          let createdIso = null;
          if (data.createdAt) {
            if (typeof data.createdAt.toDate === "function") {
              createdIso = data.createdAt.toDate().toISOString();
            } else {
              const parsed = new Date(data.createdAt);
              if (!isNaN(parsed.getTime())) createdIso = parsed.toISOString();
            }
          }

          userObj = {
            id: key,
            displayName: data.customerName || "Customer",
            phoneNumber: rawPhone || "N/A",
            role: "Customer",
            isBlocked: false,
            delivered: 0,
            pending: 0,
            rejected: 0,
            cancelled: 0,
            totalOrders: 0,
            createdAt: createdIso,
          };

          userMap.set(key, userObj);
          if (userId) userMap.set(userId, userObj);
          if (normPhone) phoneToUserKey.set(normPhone, key);
        }

        // Increment stats for this order
        userObj.totalOrders += 1;
        const status = (data.status || "").trim().toLowerCase();
        if (status.includes("deliver") || status.includes("complet")) {
          userObj.delivered += 1;
        } else if (status.includes("pending") || status.includes("accept") || status.includes("way")) {
          userObj.pending += 1;
        } else if (status.includes("reject") || status.includes("declin")) {
          userObj.rejected += 1;
        } else if (status.includes("cancel")) {
          userObj.cancelled += 1;
        }
      });

      // Deduplicate userMap values in case userId & key pointed to same reference
      const uniqueUsers = Array.from(new Set(userMap.values()));

      customers = uniqueUsers
        .filter(c => c.id !== "user_customer_demo")
        .sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeA - timeB; // Ascending order: oldest customer first
        });
    }
  } catch (error) {
    if (!error.message?.includes("default credentials")) {
      console.error("Customers fetch error:", error.message);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <h1 className="text-3xl font-serif font-bold text-forest mb-6">Manage Customers</h1>
      <AdminCustomersClient initialCustomers={customers} />
    </div>
  );
}
