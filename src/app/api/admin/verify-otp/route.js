import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function POST(request) {
  try {
    const { idToken, otp } = await request.json();

    if (!idToken || !otp) {
      return NextResponse.json({ error: "Missing token or OTP" }, { status: 400 });
    }

    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: "Server authentication service unavailable" }, { status: 500 });
    }

    // Verify token to get email
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const email = decodedToken.email;

    // Check OTP in Firestore
    const otpDocRef = adminDb.collection("admin_otps").doc(email);
    const otpDoc = await otpDocRef.get();

    if (!otpDoc.exists) {
      return NextResponse.json({ error: "OTP not found or expired" }, { status: 400 });
    }

    const data = otpDoc.data();
    
    if (data.otp !== otp) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    if (new Date() > data.expiresAt.toDate()) {
      return NextResponse.json({ error: "OTP expired" }, { status: 400 });
    }

    // OTP Valid. Delete it.
    await otpDocRef.delete();

    // Upgrade the user role if needed (ensure they are admin)
    await adminAuth.setCustomUserClaims(decodedToken.uid, { role: "admin" });

    // Create session cookie (7 days for admin)
    const expiresIn = 60 * 60 * 24 * 7 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const isProduction = process.env.NODE_ENV === "production";
    const options = {
      maxAge: expiresIn,
      httpOnly: true,
      secure: isProduction,
      path: "/",
      sameSite: "lax",
    };

    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.set("session", sessionCookie, options);

    return response;

  } catch (error) {
    console.error("OTP Verification Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
