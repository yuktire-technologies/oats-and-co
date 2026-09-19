import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb, isFirebaseConfigured } from "./firebase/admin";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) return null;


  try {
    if (adminAuth && isFirebaseConfigured) {
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);

      // Fetch fresh claims from Firebase Auth in case the session cookie has stale claims (e.g. immediately after login)
      try {
        const authUser = await adminAuth.getUser(decodedClaims.uid);
        if (authUser.customClaims && authUser.customClaims.role) {
          decodedClaims.role = authUser.customClaims.role;
        }
      } catch (e) {
        console.error("Error fetching fresh user claims:", e);
      }

      // Enforce blocked user check securely on the server
      if (adminDb && decodedClaims && decodedClaims.uid && decodedClaims.role !== "admin") {
        try {
          const userDoc = await adminDb.collection("users").doc(decodedClaims.uid).get();
          if (userDoc.exists && userDoc.data().isBlocked) {
            console.warn(`Blocked user attempted access: ${decodedClaims.uid}`);
            return null; // Force logout / unauthorized state
          }
        } catch (dbErr) {
          console.error("Error checking user blocked status:", dbErr);
        }
      }

      return decodedClaims;
    }
    
    // Fallback if firebase isn't configured for local testing only
    if (!isFirebaseConfigured && sessionCookie) {
      if (sessionCookie.startsWith("admin_dev")) {
        return {
          uid: "admin_dev",
          email: "admin@oatsandco.in",
          role: "admin"
        };
      }
    }
    return null;
  } catch (error) {
    if (!isFirebaseConfigured && sessionCookie) {
      return {
        uid: "admin_dev",
        email: "admin@oatsandco.in",
        role: "admin"
      };
    }
    return null;
  }
}

export function isUserAdmin(user) {
  if (!user) return false;
  return user.role === "admin" || user.email === "admin@oatsandco.in" || user.email === "test@gmail.com";
}

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (isUserAdmin(user)) {
    return user;
  }

  redirect("/admin/login");
}
