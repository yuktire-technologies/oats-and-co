"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithCustomToken, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const setCustomerSessionCookie = (userObj) => {
    if (!userObj || !userObj.uid) return;
    try {
      const encodedUid = encodeURIComponent(userObj.uid || "");
      const encodedPhone = encodeURIComponent(userObj.phoneNumber || "");
      const encodedName = encodeURIComponent(userObj.displayName || "");
      document.cookie = `session=mock_customer:${encodedUid}:${encodedPhone}:${encodedName}; path=/; max-age=604800`;
    } catch (e) {}
  };

  useEffect(() => {
    try {
      const savedMockUser = localStorage.getItem("mock_customer_user");
      if (savedMockUser) {
        const parsed = JSON.parse(savedMockUser);
        setUser(parsed);
        setCustomerSessionCookie(parsed);
        setLoading(false);

        // Check if customer user has been blocked by admin
        if (parsed.phoneNumber && parsed.role !== "admin") {
          fetch("/api/auth/simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phoneNumber: parsed.phoneNumber, isSignup: false }),
          })
            .then(res => res.json())
            .then(data => {
              if (data.isBlocked) {
                localStorage.removeItem("mock_customer_user");
                document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                setUser(null);
              }
            })
            .catch(() => {});
        }
      } else {
        setLoading(false);
      }
    } catch (e) {
      setLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setCustomerSessionCookie(firebaseUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithCustomToken = async (customToken, role = "customer", mockUserObj = null) => {
    try {
      if (customToken.startsWith("mock_demo_token_")) {
        const mockUid = customToken.replace("mock_demo_token_", "");
        const mockUser = mockUserObj || {
          uid: mockUid,
          phoneNumber: "",
          displayName: ""
        };
        setUser(mockUser);
        try {
          localStorage.setItem("mock_customer_user", JSON.stringify(mockUser));
          setCustomerSessionCookie(mockUser);
        } catch (e) {}
        return mockUser;
      }

      try {
        const userCredential = await signInWithCustomToken(auth, customToken);
        const idToken = await userCredential.user.getIdToken();
        
        // Set the HttpOnly cookie for server-side rendering support
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, role }),
        });

        if (!res.ok) throw new Error("Failed to set session cookie");

        return userCredential.user;
      } catch (clientAuthError) {
        console.warn("Client Firebase Auth failed, using session fallback:", clientAuthError.message);
        const fallbackUser = mockUserObj || {
          uid: customToken.includes("_") ? customToken.split("_").pop() : "user_demo",
          phoneNumber: mockUserObj?.phoneNumber || "",
          displayName: mockUserObj?.displayName || ""
        };
        setUser(fallbackUser);
        try {
          localStorage.setItem("mock_customer_user", JSON.stringify(fallbackUser));
          setCustomerSessionCookie(fallbackUser);
        } catch (e) {}
        return fallbackUser;
      }
    } catch (error) {
      console.error("Login Error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      try {
        localStorage.removeItem("mock_customer_user");
        document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      } catch (e) {}
      setUser(null);
      await firebaseSignOut(auth);
      await fetch("/api/auth/session", { method: "DELETE" });
      router.push("/");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithCustomToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
