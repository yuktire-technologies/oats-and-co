import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export async function POST(request) {
  try {
    const { idToken, role } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: "No ID token provided" }, { status: 401 });
    }

    // Customer: 14 days persistent login (Firebase Max limit)
    // Admin: 7 days persistent login
    const expiresIn = role === "admin" ? 60 * 60 * 24 * 7 * 1000 : 60 * 60 * 24 * 14 * 1000;

    // Create session cookie from ID Token
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    // Ensure cookie is secure in production
    const isProduction = process.env.NODE_ENV === "production";
    const options = {
      maxAge: expiresIn,
      httpOnly: true,
      secure: isProduction,
      path: "/",
      sameSite: "lax", // 'strict' might be better but 'lax' allows links from other sites
    };

    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.set("session", sessionCookie, options);

    return response;
  } catch (error) {
    console.error("Error creating session cookie", error);
    return NextResponse.json({ error: "Unauthorized request" }, { status: 401 });
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true }, { status: 200 });
    response.cookies.delete("session");
    return response;
  } catch (error) {
    console.error("Error deleting session cookie", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
