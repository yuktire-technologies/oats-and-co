import { NextResponse } from "next/server";
import { adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth-server";

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

export async function GET(request) {
  try {
    let user = await getCurrentUser();

    // Fallback: Check query params if server session is not present
    const { searchParams } = new URL(request.url);
    const paramUid = searchParams.get("userId");
    const paramPhone = searchParams.get("phone");

    if ((!user || !user.uid || user.uid === "user_customer_demo") && paramUid) {
      user = {
        uid: paramUid,
        phoneNumber: paramPhone || user?.phoneNumber || "",
        displayName: user?.displayName || "Customer"
      };
    }

    if (!user || !user.uid) {
      return NextResponse.json({ orders: [] }, { status: 200 });
    }

    if (!adminDb || !isFirebaseConfigured) {
      return NextResponse.json({ orders: [] }, { status: 200 });
    }

    const targetUid = user.uid;
    const targetPhone = user.phoneNumber;
    const ordersMap = new Map();

    // Query 1: By exact userId
    if (targetUid) {
      const snapshot = await adminDb.collection("orders")
        .where("userId", "==", targetUid)
        .get();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        ordersMap.set(doc.id, {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (typeof data.updatedAt === 'string' ? data.updatedAt : undefined),
        });
      });
    }

    // Query 2: By phone variants if available
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
          if (!ordersMap.has(doc.id)) {
            const data = doc.data();
            ordersMap.set(doc.id, {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (typeof data.updatedAt === 'string' ? data.updatedAt : undefined),
            });
          }
        });
      });
    }

    // STRICT BACKEND SECURITY ENFORCEMENT:
    // Only return orders that match targetUid or targetPhone
    let orders = Array.from(ordersMap.values()).filter(order => {
      const isOwnerUid = targetUid && order.userId === targetUid;
      const isOwnerPhone = targetPhone && phonesMatch(order.customerPhone, targetPhone);
      return isOwnerUid || isOwnerPhone;
    });

    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    console.error("Fetch User Orders API Error:", error);
    return NextResponse.json({ orders: [] }, { status: 200 });
  }
}
