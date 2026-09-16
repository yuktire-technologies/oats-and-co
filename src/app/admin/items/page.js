import React from "react";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase/admin";
import AdminItemsClient from "./AdminItemsClient";

export default async function AdminItemsPage() {
  await requireAdmin();

  let items = [];
  let addons = [];
  try {
    if (adminDb) {
      const snapshot = await adminDb.collection("items").get();
      items = snapshot.docs.map(doc => {
        const data = doc.data();
        
        const parseDate = (field) => {
          if (!field) return new Date().toISOString();
          if (typeof field.toDate === "function") return field.toDate().toISOString();
          if (field._seconds !== undefined) return new Date(field._seconds * 1000).toISOString();
          if (typeof field === "string") return field;
          return new Date().toISOString();
        };

        return {
          id: doc.id,
          name: data.name || "",
          ingredients: data.ingredients || "",
          price: Number(data.price || 0),
          quantityLabel: data.quantityLabel || "",
          nutrition: data.nutrition || "",
          isAvailable: Boolean(data.isAvailable ?? true),
          image: data.image || null,
          createdAt: parseDate(data.createdAt),
          updatedAt: parseDate(data.updatedAt),
        };
      }).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      const addonsSnapshot = await adminDb.collection("addons").get();
      addons = addonsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || "",
          description: data.description || "",
          price: Number(data.price || 0),
          isAvailable: Boolean(data.isAvailable ?? true),
          image: data.image || null,
        };
      });
    }
  } catch (error) {
    // Graceful error logging
    if (!error.message?.includes("default credentials")) {
      console.error("Failed to fetch items for admin:", error.message);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      <h1 className="text-3xl font-serif font-bold text-forest mb-6">Manage Items & Add-ons</h1>
      <AdminItemsClient initialItems={items} initialAddons={addons} />
    </div>
  );
}
