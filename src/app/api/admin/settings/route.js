import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(request) {
  try {
    await requireAdmin();
    const data = await request.json();
    
    if (!adminDb) {
      // Mock success response during testing mode
      return NextResponse.json({ success: true, isMock: true }, { status: 200 });
    }

    await adminDb.collection("settings").doc("delivery").set({
      ...data,
      updatedAt: new Date(),
    }, { merge: true });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Settings Update Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
