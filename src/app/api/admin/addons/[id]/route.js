import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase/admin";

export async function PATCH(request, context) {
  try {
    await requireAdmin();
    const params = await context.params;
    const addonId = params.id;
    const data = await request.json();

    if (!adminDb) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }
    
    await adminDb.collection("addons").doc(addonId).update({
      ...data,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Addon Update Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    await requireAdmin();
    const params = await context.params;
    const addonId = params.id;
    
    if (!adminDb) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    await adminDb.collection("addons").doc(addonId).delete();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Addon Delete Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
