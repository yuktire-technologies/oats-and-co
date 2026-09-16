import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

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

if (!getApps().length) {
  try {
    if (isConfigured) {
      app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: pKey,
        }),
      });
    }
  } catch (error) {
    console.error("Firebase Admin Initialization Error:", error.message);
  }
} else {
  app = getApps()[0];
}

export const isFirebaseConfigured = isConfigured;
export const adminAuth = (app && isConfigured) ? getAuth(app) : null;
export const adminDb = (app && isConfigured) ? getFirestore(app) : null;





