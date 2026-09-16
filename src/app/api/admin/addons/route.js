import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request) {
  try {
    await requireAdmin();
    const data = await request.json();
    
    if (!adminDb) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const addonPayload = {
      name: String(data.name || "Add-on Fruit"),
      description: String(data.description || ""),
      price: Number(data.price || 0),
      isAvailable: Boolean(data.isAvailable ?? true),
      image: data.image || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await adminDb.collection("addons").add(addonPayload);

    return NextResponse.json({ success: true, id: docRef.id }, { status: 200 });
  } catch (error) {
    console.error("Add-on Create Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
