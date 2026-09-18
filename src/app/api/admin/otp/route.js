import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { Resend } from "resend";

export async function POST(request) {
  try {
    const { idToken, email: reqEmail, action } = await request.json();
    let email = reqEmail;
    
    // If it's a login action, verify the idToken to get the email securely
    if (action === "login") {
      if (!idToken) return NextResponse.json({ error: "Missing token" }, { status: 401 });
      if (!adminAuth) return NextResponse.json({ error: "Server authentication service unavailable" }, { status: 500 });
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      email = decodedToken.email;
    }

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (adminDb) {
      // Store in Firestore
      await adminDb.collection("admin_otps").doc(email).set({
        otp,
        expiresAt,
        action
      });
    }

    // Send email using Resend if API key is provided
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const subject = action === "reset" ? "Reset Password OTP for Oats & Co" : "Login OTP for Oats & Co";
      const body = action === "reset" 
        ? `Reset Password OTP for Oats & Co is ${otp}. It will expire after 10 minutes.`
        : `Login OTP for Oats & Co is ${otp}. It will expire after 10 minutes.`;

      await resend.emails.send({
        from: process.env.RESEND_FROM_MAIL || "admin@oatsandco.in",
        to: email,
        subject: subject,
        text: body,
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("OTP Generation Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

