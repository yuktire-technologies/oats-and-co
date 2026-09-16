import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase/admin";

export async function PATCH(request, context) {
  try {
    await requireAdmin();
    const params = await context.params;
    const itemId = params.id;
    const data = await request.json();

    if (!adminDb) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }
    
    const updateData = { ...data };
    if (updateData.name) {
      updateData.searchName = String(updateData.name).toLowerCase().trim();
    }

    await adminDb.collection("items").doc(itemId).update({
      ...updateData,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Item Update Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    await requireAdmin();
    const params = await context.params;
    const itemId = params.id;
    
    if (!adminDb) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    await adminDb.collection("items").doc(itemId).delete();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Item Delete Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
