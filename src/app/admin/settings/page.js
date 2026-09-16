import React from "react";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import AdminSettingsClient from "./AdminSettingsClient";

export default async function AdminSettingsPage() {
  await requireAdmin();

  let settings = {};
  try {
    if (adminDb && isFirebaseConfigured) {
      const doc = await adminDb.collection("settings").doc("delivery").get();
      if (doc.exists) {
        const data = doc.data();
        const parseDate = (field) => {
          if (!field) return new Date().toISOString();
          if (typeof field.toDate === "function") return field.toDate().toISOString();
          if (field._seconds !== undefined) return new Date(field._seconds * 1000).toISOString();
          if (typeof field === "string") return field;
          return new Date().toISOString();
        };

        settings = {
          openTime: data.openTime || "06:00",
          closeTime: data.closeTime || "10:00",
          status: data.status || "Open",
          updatedAt: parseDate(data.updatedAt),
        };
      }
    }
  } catch (error) {
    if (!error.message?.includes("default credentials")) {
      console.error("Failed to fetch settings:", error.message);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto w-full">
      <h1 className="text-3xl font-serif font-bold text-forest mb-6">Delivery Settings</h1>
      <AdminSettingsClient initialSettings={settings} />
    </div>
  );
}
