"use client";

import { useEffect } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import app from "@/lib/firebase/client";

export default function FCMProvider() {
  useEffect(() => {
    const requestPermissionAndGetToken = async () => {
      try {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            const messaging = getMessaging(app);
            const currentToken = await getToken(messaging, {
              vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
            });

            if (currentToken) {
              await fetch("/api/fcm/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: currentToken }),
              });
            }
          }
        }
      } catch (error) {
        console.error("Failed to get FCM token:", error);
      }
    };

    const listenForMessages = () => {
      try {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
          const messaging = getMessaging(app);
          onMessage(messaging, (payload) => {
            console.log("Message received. ", payload);
            // Optionally, we could show a toast here. But for now logging is fine.
          });
        }
      } catch (error) {
        // Ignored
      }
    };

    if (app && 'Notification' in window && 'serviceWorker' in navigator) {
      // Small timeout to not block main thread on load
      setTimeout(() => {
        requestPermissionAndGetToken();
        listenForMessages();
      }, 2000);
    }
  }, []);

  return null;
}
