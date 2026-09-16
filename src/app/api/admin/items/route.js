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

    const itemPayload = {
      name: String(data.name || "Healthy Item"),
      searchName: String(data.name || "").toLowerCase().trim(),
      category: String(data.category || "Oats").trim(),
      ingredients: String(data.ingredients || ""),
      price: Number(data.price || 0),
      quantityLabel: String(data.quantityLabel || ""),
      nutrition: String(data.nutrition || ""),
      isAvailable: Boolean(data.isAvailable ?? true),
      image: data.image || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await adminDb.collection("items").add(itemPayload);

    return NextResponse.json({ success: true, id: docRef.id }, { status: 200 });
  } catch (error) {
    console.error("Item Create Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
