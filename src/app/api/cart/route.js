import { NextResponse } from "next/server";
import { adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import { getCurrentUser } from "@/lib/auth-server";

// GET /api/cart - Fetch persistent cart items from Firestore for logged-in user
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    if (!adminDb || !isFirebaseConfigured) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const cartDoc = await adminDb.collection("carts").doc(user.uid).get();
    if (!cartDoc.exists) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const data = cartDoc.data();
    return NextResponse.json({ items: data.items || [] }, { status: 200 });
  } catch (error) {
    console.error("Fetch Cart Error:", error);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}

// POST /api/cart - Save persistent cart items to Firestore for logged-in user
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
    }

    const { items } = await request.json();

    if (adminDb && isFirebaseConfigured) {
      await adminDb.collection("carts").doc(user.uid).set({
        userId: user.uid,
        items: items || [],
        updatedAt: new Date()
      }, { merge: true });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Save Cart Error:", error);
    return NextResponse.json({ error: error.message || "Failed to update cart" }, { status: 500 });
  }
}
