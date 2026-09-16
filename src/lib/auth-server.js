import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, isFirebaseConfigured } from "./firebase/admin";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) return null;



  if (sessionCookie && sessionCookie.includes("mock_customer")) {
    if (sessionCookie.startsWith("mock_customer:")) {
      try {
        const parts = sessionCookie.split(":");
        const uid = decodeURIComponent(parts[1] || "");
        const phoneNumber = parts[2] ? decodeURIComponent(parts[2]) : "";
        const displayName = parts[3] ? decodeURIComponent(parts[3]) : "";
        if (uid) {
          return {
            uid,
            phoneNumber,
            displayName,
            role: "customer"
          };
        }
      } catch (e) { }
    }
    return {
      uid: "user_customer_demo",
      phoneNumber: "",
      displayName: "",
      role: "customer"
    };
  }

  try {
    if (adminAuth && isFirebaseConfigured) {
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
      return decodedClaims;
    }
    if (!isFirebaseConfigured && sessionCookie && !sessionCookie.includes("mock_customer")) {
      return {
        uid: "admin_dev",
        email: "admin@oatsandco.in",
        role: "admin"
      };
    }
    return null;
  } catch (error) {
    if (!isFirebaseConfigured && sessionCookie && !sessionCookie.includes("mock_customer")) {
      return {
        uid: "admin_dev",
        email: "admin@oatsandco.in",
        role: "admin"
      };
    }
    return null;
  }
}

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (user && (user.role === "admin" || user.email === "admin@oatsandco.in" || user.email === "test@gmail.com")) {
    return user;
  }

  redirect("/admin/login");
}
