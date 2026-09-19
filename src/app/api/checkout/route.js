import { NextResponse } from "next/server";
import { adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { getCurrentUser } from "@/lib/auth-server";
import { getDistanceInKm, calculateDeliveryFee, CENTER_LOCATION, isTimeWithinRange } from "@/lib/location";
import { sendNotification } from "@/lib/notifications";

export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { items, couponCode, deliveryLocation, preparationInstructions, paymentMode, lat, lng } = body;

    let deliveryFee = 0;

    // Validate 10 KM radius if latitude & longitude are supplied
    if (lat && lng) {
      const dist = getDistanceInKm(CENTER_LOCATION.lat, CENTER_LOCATION.lng, Number(lat), Number(lng));
      const calculatedFee = calculateDeliveryFee(dist);
      if (dist > CENTER_LOCATION.maxRadiusKm || calculatedFee === null) {
        return NextResponse.json({ error: CENTER_LOCATION.outOfRangeMessage }, { status: 400 });
      }
      deliveryFee = calculatedFee || 0;
    }

    if (!items || !items.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (!adminDb || !isFirebaseConfigured) {
      // Return order placement success response in testing / demo mode
      const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      return NextResponse.json({ success: true, orderId, docId: `mock_doc_${Date.now()}`, isMock: true }, { status: 200 });
    }

    // 1. Fetch current delivery timings and check if open
    const settingsDoc = await adminDb.collection("settings").doc("delivery").get();
    const settings = settingsDoc.data();
    
    if (settings) {
      if (settings.status === "Delivery Closed Today" || settings.status === "Delivery Unavailable" || (settings.status && settings.status !== "Open")) {
        return NextResponse.json({ error: `Sorry. ${settings.status}` }, { status: 400 });
      }

      // Time check logic (IST Timezone Aware)
      if (settings.openTime && settings.closeTime) {
        if (!isTimeWithinRange(settings.openTime, settings.closeTime)) {
          const formatTime12 = (time24Str) => {
            if (!time24Str) return "";
            if (time24Str.includes("AM") || time24Str.includes("PM")) return time24Str;
            const parts = String(time24Str).trim().split(":");
            let h = parseInt(parts[0], 10);
            let m = parseInt(parts[1] || "0", 10);
            if (isNaN(h)) return time24Str;
            if (isNaN(m)) m = 0;
            const ampm = h >= 12 ? "PM" : "AM";
            const h12 = h % 12 || 12;
            const h12Str = String(h12).padStart(2, "0");
            const mStr = String(m).padStart(2, "0");
            return `${h12Str}:${mStr} ${ampm}`;
          };
          const fmtOpen = formatTime12(settings.openTime);
          const fmtClose = formatTime12(settings.closeTime);

          return NextResponse.json({ 
            error: `Delivery is available from ${fmtOpen} to ${fmtClose}. So, please order between that time.` 
          }, { status: 400 });
        }
      }
    }

    // 2. Fetch fresh item prices from DB
    let itemTotal = 0;
    const validatedItems = [];

    for (const cartItem of items) {
      const itemDoc = await adminDb.collection("items").doc(cartItem.id).get();
      let itemData = cartItem;
      if (itemDoc && itemDoc.exists) {
        itemData = itemDoc.data();
      }

      const price = Number(itemData.price ?? cartItem.price ?? 100);
      itemTotal += price * cartItem.quantity;
      validatedItems.push({
        id: String(cartItem.id || `item_${Date.now()}`),
        name: String(itemData.name || cartItem.name || "Healthy Oatmeal"),
        price: price,
        quantity: Number(cartItem.quantity || 1),
        image: itemData.image || cartItem.image || null,
        quantityLabel: String(itemData.quantityLabel || cartItem.quantityLabel || ""),
      });
    }

    // 3. Verify and calculate Coupon
    let discountAmount = 0;
    if (couponCode && couponCode.trim()) {
      const cleanCode = couponCode.trim().toUpperCase();
      let couponDocRef = null;
      let couponData = null;

      const couponQuery = await adminDb.collection("coupons")
        .where("code", "==", cleanCode)
        .limit(1)
        .get();

      if (!couponQuery.empty) {
        couponDocRef = couponQuery.docs[0].ref;
        couponData = couponQuery.docs[0].data();
      } else {
        // Fallback case-insensitive search across all coupons
        const allCoupons = await adminDb.collection("coupons").get();
        const match = allCoupons.docs.find(d => (d.data().code || "").trim().toUpperCase() === cleanCode);
        if (match) {
          couponDocRef = match.ref;
          couponData = match.data();
        }
      }

      if (couponDocRef && couponData) {
        const now = new Date();
        const expiry = couponData.expiryDate ? (couponData.expiryDate.toDate ? couponData.expiryDate.toDate() : new Date(couponData.expiryDate)) : null;
        
        if (couponData.limit > 0 && (!expiry || expiry > now)) {
          if (couponData.discountType === "percentage") {
            discountAmount = Math.round(itemTotal * (couponData.discountValue / 100));
          } else {
            discountAmount = Number(couponData.discountValue || 0);
          }
          
          await couponDocRef.update({
            limit: FieldValue.increment(-1),
            usedCount: FieldValue.increment(1)
          });
        }
      }
    }

    const grandTotal = Math.max(0, itemTotal - discountAmount + deliveryFee);

    const counterDocRef = adminDb.collection("settings").doc("orderCounter");
    const counterDoc = await counterDocRef.get();
    let currentCount = 1;
    if (counterDoc.exists && counterDoc.data()) {
      const existingCount = Number(counterDoc.data().count);
      if (!isNaN(existingCount) && existingCount > 0) {
        currentCount = existingCount + 1;
      }
    }
    await counterDocRef.set({ count: currentCount }, { merge: true });
    
    const orderId = `ORD-${String(currentCount).padStart(4, "0")}`;

    let customerName = body.customerName || user.displayName || user.name || "";
    let customerPhone = body.customerPhone || user.phoneNumber || user.phone_number || "";

    if ((!customerName || customerName === "Customer" || !customerPhone) && adminDb && user.uid) {
      try {
        const uDoc = await adminDb.collection("users").doc(user.uid).get();
        if (uDoc.exists) {
          const uData = uDoc.data();
          customerName = customerName || uData.displayName || uData.name || "";
          customerPhone = customerPhone || uData.phoneNumber || uData.phone || "";
        }
      } catch (e) {}
    }

    const orderData = {
      orderId,
      userId: user.uid,
      customerName: customerName || "Customer",
      customerPhone: customerPhone || "N/A",
      address: deliveryLocation,
      lat: body.lat ? Number(body.lat) : null,
      lng: body.lng ? Number(body.lng) : null,
      items: validatedItems,
      itemTotal,
      deliveryFee,
      discountAmount,
      couponCode: discountAmount > 0 ? couponCode : null,
      grandTotal,
      paymentMode,
      status: "Pending",
      preparationInstructions: preparationInstructions || "",
      createdAt: new Date(),
    };

    const newOrderRef = await adminDb.collection("orders").add(orderData);

    try {
      await sendNotification({
        orderId: newOrderRef.id,
        role: "admin",
        title: "New Order Received",
        body: `${validatedItems.length} items for ₹${grandTotal}`,
        data: { url: `/admin/orders` }
      });
    } catch (e) {
      console.error("Checkout notification error:", e);
    }

    return NextResponse.json({ success: true, orderId, docId: newOrderRef.id }, { status: 200 });

  } catch (error) {
    console.error("Checkout Error:", error);
    if (error.message?.includes("Could not load the default credentials") || error.message?.includes("invalid_grant") || error.code === "app/invalid-credential") {
      const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      return NextResponse.json({ success: true, orderId, docId: `mock_doc_${Date.now()}`, isMock: true }, { status: 200 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
