import { NextResponse } from "next/server";
import { adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }

    if (!adminDb || !isFirebaseConfigured) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }

    // Firestore prefix range query
    // Search by searchName (lowercase)
    const lowerQuery = q.toLowerCase();
    const strFrontCode = lowerQuery.slice(0, -1) + String.fromCharCode(lowerQuery.charCodeAt(lowerQuery.length - 1) + 1);

    let snapshot;
    try {
      snapshot = await adminDb
        .collection("items")
        .where("isAvailable", "==", true)
        .where("searchName", ">=", lowerQuery)
        .where("searchName", "<", strFrontCode)
        .limit(10)
        .get();

      // If no docs found with searchName prefix, perform in-memory fallback on item name only
      if (snapshot.empty) {
        const allItemsSnapshot = await adminDb.collection("items").where("isAvailable", "==", true).get();
        const filteredDocs = allItemsSnapshot.docs
          .filter((doc) => {
            const data = doc.data();
            const nameMatch = (data.name || "").toLowerCase().includes(lowerQuery);
            const searchNameMatch = (data.searchName || "").toLowerCase().includes(lowerQuery);
            return nameMatch || searchNameMatch;
          })
          .slice(0, 10);
        snapshot = { docs: filteredDocs };
      }
    } catch (indexError) {
      // In case composite index is still building or missing in Firestore console
      const allItemsSnapshot = await adminDb.collection("items").where("isAvailable", "==", true).get();
      const filteredDocs = allItemsSnapshot.docs
        .filter((doc) => {
          const data = doc.data();
          const nameMatch = (data.name || "").toLowerCase().includes(lowerQuery);
          const searchNameMatch = (data.searchName || "").toLowerCase().includes(lowerQuery);
          return nameMatch || searchNameMatch;
        })
        .slice(0, 10);
      snapshot = { docs: filteredDocs };
    }

    const suggestions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "",
        searchName: data.searchName || "",
        category: data.category || "Oats",
        price: Number(data.price || 0),
        ingredients: data.ingredients || "",
        quantityLabel: data.quantityLabel || "",
        nutrition: data.nutrition || "",
        image: data.image || null,
        isAvailable: Boolean(data.isAvailable ?? true),
      };
    });

    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ suggestions: [], error: error.message }, { status: 500 });
  }
}
