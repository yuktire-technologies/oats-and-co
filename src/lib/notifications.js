import { adminDb, isFirebaseConfigured } from "./firebase/admin";
import { getMessaging } from "firebase-admin/messaging";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Sends a push notification to users based on role or userId with retries and extensive logging.
 * @param {Object} params
 * @param {string} [params.userId] - The specific user ID to notify
 * @param {string} [params.role] - Or a role to notify (e.g., "admin")
 * @param {string} params.title
 * @param {string} params.body
 * @param {Object} [params.data] - Custom key-value pairs (must be strings)
 * @param {string} [params.orderId] - Order ID for logging trace
 */
export async function sendNotification({ userId, role, title, body, data = {}, orderId = "UNKNOWN" }) {
  const logPrefix = `[Notification] [Order: ${orderId}] [Type: ${title}]`;

  if (!isFirebaseConfigured || !adminDb) {
    console.log(`${logPrefix} Firebase not configured, skipping.`);
    return;
  }

  try {
    console.log(`${logPrefix} Initiating for recipient -> ${userId ? `User: ${userId}` : `Role: ${role}`}`);
    let tokensRef = adminDb.collection("fcmTokens");
    let query;

    if (userId) {
      query = tokensRef.where("uid", "==", userId);
    } else if (role) {
      query = tokensRef.where("role", "==", role);
    } else {
      console.warn(`${logPrefix} No recipient specified. Aborting.`);
      return;
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      console.log(`${logPrefix} No FCM tokens found for recipient. Notification skipped.`);
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

    if (tokens.length === 0) {
      console.log(`${logPrefix} Tokens exist but are empty strings. Notification skipped.`);
      return;
    }

    console.log(`${logPrefix} Found ${tokens.length} valid token(s). Preparing to send.`);

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

    let attempt = 0;
    let success = false;
    let response = null;

    while (attempt < MAX_RETRIES && !success) {
      attempt++;
      try {
        console.log(`${logPrefix} Attempt ${attempt}/${MAX_RETRIES} to send FCM multicast...`);
        response = await messaging.sendEachForMulticast(payload);
        success = true; // Sent successfully (even if some individual tokens failed, the request itself succeeded)
      } catch (err) {
        console.error(`${logPrefix} FCM Request Error on attempt ${attempt}:`, err.code, err.message);
        
        // Retry only on transient errors
        const retryableErrors = ['messaging/internal-error', 'messaging/server-unavailable', 'messaging/message-rate-exceeded'];
        if (retryableErrors.includes(err.code) && attempt < MAX_RETRIES) {
          console.log(`${logPrefix} Transient error, sleeping for ${RETRY_DELAY_MS * attempt}ms before retry...`);
          await sleep(RETRY_DELAY_MS * attempt); // exponential backoff
        } else {
          console.error(`${logPrefix} Non-retryable error or max retries reached. Aborting.`);
          break; // Stop retrying
        }
      }
    }

    if (!success || !response) {
      console.error(`${logPrefix} Failed to send notification after ${attempt} attempts.`);
      return;
    }

    console.log(`${logPrefix} FCM Request Success! Success count: ${response.successCount}, Failure count: ${response.failureCount}`);

    // Clean up stale tokens
    const tokensToRemove = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const error = resp.error;
        console.warn(`${logPrefix} Token index ${idx} failed: ${error.code} - ${error.message}`);
        
        if (
          error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered'
        ) {
          console.log(`${logPrefix} Pruning stale/unregistered token...`);
          tokensToRemove.push(docs[idx].delete());
        }
      }
    });

    if (tokensToRemove.length > 0) {
      await Promise.allSettled(tokensToRemove);
      console.log(`${logPrefix} Successfully pruned ${tokensToRemove.length} stale token(s) from DB.`);
    }

  } catch (error) {
    console.error(`${logPrefix} Unhandled exception in notification service:`, error);
  }
}
