import React from "react";
import { adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import HomeClient from "./HomeClient";

// Make homepage dynamic to reflect real-time menu availability changes from admin
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initialItems = [];
  let initialAddons = [];
  let initialCoupons = [];
  let initialSettings = null;

  try {
    if (adminDb && isFirebaseConfigured) {
      // 1. Fetch available items
      const itemsSnapshot = await adminDb.collection("items").where("isAvailable", "==", true).get();
      initialItems = itemsSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "",
            ingredients: data.ingredients || "",
            price: Number(data.price || 0),
            quantityLabel: data.quantityLabel || "",
            nutrition: data.nutrition || "",
            isAvailable: Boolean(data.isAvailable ?? true),
            image: data.image || null,
          };
        })
        .filter(item => item.isAvailable === true);

      // 2. Fetch coupons
      const couponsSnapshot = await adminDb.collection("coupons").get();
      const now = new Date();
      initialCoupons = couponsSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            code: data.code || "",
            discountType: data.discountType || "percentage",
            discountValue: Number(data.discountValue || 0),
            limit: Number(data.limit || 0),
            expiryDate: data.expiryDate ? (typeof data.expiryDate.toDate === "function" ? data.expiryDate.toDate().toISOString() : String(data.expiryDate)) : null,
          };
        })
        .filter(c => {
          if (!c.code || c.limit <= 0) return false;
          if (c.expiryDate) {
            const exp = new Date(c.expiryDate);
            if (exp < now) return false;
          }
          return true;
        });

      // 3. Fetch delivery settings
      const settingsDoc = await adminDb.collection("settings").doc("delivery").get();
      if (settingsDoc.exists) {
        const sData = settingsDoc.data();
        initialSettings = {
          openTime: sData.openTime || "06:00",
          closeTime: sData.closeTime || "10:00",
          status: sData.status || "Open",
          customMessage: sData.customMessage || "",
        };
      }

      // 4. Fetch available add-ons
      try {
        const addonsSnapshot = await adminDb.collection("addons").where("isAvailable", "==", true).get();
        initialAddons = addonsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "",
            description: data.description || "",
            price: Number(data.price || 0),
            image: data.image || null,
            isAvailable: Boolean(data.isAvailable ?? true),
          };
        }).filter(a => a.isAvailable === true);
      } catch (aErr) {}

      // 5. Fetch accepted customer reviews
      let acceptedReviews = [];
      try {
        const reviewsSnapshot = await adminDb.collection("reviews").get();
        acceptedReviews = reviewsSnapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString()),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
            };
          })
          .filter(r => r.status === "Accepted");
      } catch (e) {}

      initialItems = initialItems.map(item => {
        const itemReviews = acceptedReviews.filter(r => {
          if (r.itemIds && Array.isArray(r.itemIds) && r.itemIds.includes(item.id)) {
            return true;
          }
          if (r.items && Array.isArray(r.items) && r.items.some(i => String(i.id) === String(item.id) || i.name?.toLowerCase() === item.name?.toLowerCase())) {
            return true;
          }
          if (r.itemsSummary && item.name && r.itemsSummary.toLowerCase().includes(item.name.toLowerCase())) {
            return true;
          }
          return false;
        });

        const count = itemReviews.length;
        const avgScore = count > 0 ? (itemReviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) / count).toFixed(1) : null;

        return {
          ...item,
          rating: avgScore ? { score: avgScore, count } : null,
        };
      });

      var initialReviewsData = acceptedReviews;
    }
  } catch (error) {
    if (!error.message?.includes("default credentials")) {
      console.error("Failed to fetch homepage data:", error.message);
    }
  }

  return (
    <div className="min-h-full pb-24">
      <HomeClient 
        initialItems={initialItems} 
        initialAddons={initialAddons || []}
        initialCoupons={initialCoupons} 
        initialSettings={initialSettings} 
        initialReviews={initialReviewsData || []}
      />
    </div>
  );
}
