import { NextResponse } from "next/server";
import { adminAuth, adminDb, isFirebaseConfigured } from "@/lib/firebase/admin";

export async function POST(request) {
  try {
    const { phoneNumber, name, isSignup } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const formattedPhone = phoneNumber.startsWith("+91") ? phoneNumber : `+91${cleanPhone}`;
    const mockUid = `user_${cleanPhone}`;

    // 1. Check if user exists in Firestore users collection
    if (adminDb) {
      try {
        const userQuery = await adminDb.collection("users")
          .where("phoneNumber", "==", formattedPhone)
          .get();

        if (!userQuery.empty) {
          const uDocData = userQuery.docs[0].data();
          if (uDocData.isBlocked) {
            return NextResponse.json({
              isBlocked: true,
              error: "You are blocked due to some suspicious activity. You can't login"
            }, { status: 403 });
          }
        }

        if (!isSignup && userQuery.empty) {
          // If not in Firebase Auth either, return needsSignup
          let existsInAuth = false;
          if (adminAuth) {
            try {
              await adminAuth.getUserByPhoneNumber(formattedPhone);
              existsInAuth = true;
            } catch (e) {}
          }
          
          if (!existsInAuth) {
            return NextResponse.json({ needsSignup: true }, { status: 200 });
          }
        }

        if (isSignup || !userQuery.empty) {
          const userDoc = !userQuery.empty ? userQuery.docs[0] : null;
          const existingData = userDoc ? userDoc.data() : {};
          const finalName = name || existingData.displayName || "Customer";

          const updatePayload = {
            uid: userDoc ? userDoc.id : mockUid,
            phoneNumber: formattedPhone,
            displayName: finalName,
            role: "customer",
            updatedAt: new Date()
          };

          if (!existingData.createdAt) {
            updatePayload.createdAt = new Date();
          }

          await adminDb.collection("users").doc(userDoc ? userDoc.id : mockUid).set(updatePayload, { merge: true });

          let customToken;
          if (adminAuth && isFirebaseConfigured) {
            customToken = await adminAuth.createCustomToken(userDoc ? userDoc.id : mockUid);
          } else {
            customToken = "mock_demo_token_" + (userDoc ? userDoc.id : mockUid);
          }

          return NextResponse.json({
            success: true,
            customToken,
            user: {
              uid: userDoc ? userDoc.id : mockUid,
              phoneNumber: formattedPhone,
              displayName: finalName
            }
          }, { status: 200 });
        }
      } catch (dbErr) {
        console.error("Firestore user query error:", dbErr);
      }
    }

    // 2. If not found in DB and !isSignup, request Signup
    if (!isSignup) {
      return NextResponse.json({ needsSignup: true }, { status: 200 });
    }

    // 3. Fallback successful signup response
    let fallbackToken = "mock_demo_token_" + mockUid;
    if (adminAuth && isFirebaseConfigured) {
      try {
        fallbackToken = await adminAuth.createCustomToken(mockUid);
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      customToken: fallbackToken,
      user: {
        uid: mockUid,
        phoneNumber: formattedPhone,
        displayName: name || "Customer"
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Auth Simulation Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
