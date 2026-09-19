"use client";

import { useEffect } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import app from "@/lib/firebase/client";
import { useAuth } from "@/context/AuthContext";

export default function FCMProvider() {
  const { user } = useAuth();

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

            if (currentToken && user?.uid) {
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
          });
        }
      } catch (error) {
        // Ignored
      }
    };

    if (app && 'Notification' in window && 'serviceWorker' in navigator) {
      setTimeout(() => {
        requestPermissionAndGetToken();
        listenForMessages();
      }, 2000);
    }
  }, [user?.uid]);

  return null;
}
