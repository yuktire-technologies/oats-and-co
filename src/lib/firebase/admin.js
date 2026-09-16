import admin from "firebase-admin";

let app;

const getPrivateKey = () => {
  const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!key) return undefined;
  let sanitized = key.trim();
  if (sanitized.startsWith('"') && sanitized.endsWith('"')) {
    sanitized = sanitized.slice(1, -1);
  }
  return sanitized.replace(/\\n/g, "\n");
};

const pKey = getPrivateKey();
const isConfigured = Boolean(
  process.env.FIREBASE_ADMIN_PROJECT_ID && 
  process.env.FIREBASE_ADMIN_CLIENT_EMAIL && 
  pKey && 
  pKey.includes("-----BEGIN PRIVATE KEY-----")
);

if (typeof window === "undefined" && isConfigured) {
  try {
    if (!admin.apps.length) {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: pKey,
        }),
      });
    } else {
      app = admin.apps[0];
    }
  } catch (error) {
    console.error("Firebase Admin Initialization Error:", error.message);
  }
}

export const isFirebaseConfigured = isConfigured;
export const adminAuth = (app && isConfigured) ? admin.auth() : null;
export const adminDb = (app && isConfigured) ? admin.firestore() : null;





