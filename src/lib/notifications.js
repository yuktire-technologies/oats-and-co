import { adminDb, isFirebaseConfigured } from "./firebase/admin";
import { getMessaging } from "firebase-admin/messaging";

/**
 * Sends a push notification to users based on role or userId.
 * @param {Object} params
 * @param {string} [params.userId] - The specific user ID to notify
 * @param {string} [params.role] - Or a role to notify (e.g., "admin")
 * @param {string} params.title
 * @param {string} params.body
 * @param {Object} [params.data] - Custom key-value pairs (must be strings)
 */
export async function sendNotification({ userId, role, title, body, data = {} }) {
  if (!isFirebaseConfigured || !adminDb) {
    console.log("Firebase not configured, skipping notification:", title);
    return;
  }

  try {
    let tokensRef = adminDb.collection("fcmTokens");
    let query;

    if (userId) {
      query = tokensRef.where("uid", "==", userId);
    } else if (role) {
      query = tokensRef.where("role", "==", role);
    } else {
      return;
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      return;
    }

    const tokens = [];
    const docs = [];

    snapshot.forEach(doc => {
      const docData = doc.data();
      if (docData.token) {
        tokens.push(docData.token);
        docs.push(doc.ref);
      }
    });

    if (tokens.length === 0) return;

    const messaging = getMessaging();
    const payload = {
      notification: {
        title,
        body,
      },
      data: {
        ...data,
      },
      tokens,
    };

    const response = await messaging.sendEachForMulticast(payload);

    // Clean up stale tokens
    const tokensToRemove = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const error = resp.error;
        if (
          error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered'
        ) {
          tokensToRemove.push(docs[idx].delete());
        }
      }
    });

    if (tokensToRemove.length > 0) {
      await Promise.all(tokensToRemove);
    }

  } catch (error) {
    console.error("Failed to send FCM notification:", error);
    // Suppress error so it doesn't break the main flow
  }
}
