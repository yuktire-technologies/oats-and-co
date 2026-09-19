"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useRouter } from "next/navigation";
import { User, LogOut, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const { user, loading, loginWithCustomToken, logout } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [isSignupStep, setIsSignupStep] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [saveErrorMsg, setSaveErrorMsg] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const saveTimerRef = useRef(null);
  const router = useRouter();

  React.useEffect(() => {
    if (user?.displayName) {
      setEditedName(user.displayName);
    }
  }, [user]);

  if (loading) {
    return <div className="flex h-full items-center justify-center p-6 text-text-muted">Loading...</div>;
  }

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    setError("");
    setIsLoading(true);

    const fullPhone = phoneNumber.startsWith("+91") ? phoneNumber : `+91${phoneNumber}`;

    try {
      const res = await fetch("/api/auth/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: fullPhone,
          isSignup: false
        }),
      });

      const data = await res.json();

      if (data.isBlocked) {
        setBlockedModalOpen(true);
        return;
      }

      if (data.needsSignup) {
        setIsSignupStep(true);
      } else if (data.success && data.customToken) {
        await loginWithCustomToken(data.customToken, "customer");
        router.push("/");
      } else {
        setError(data.error || "An error occurred");
      }
    } catch (err) {
      // Handle network errors or failure to retrieve token
      setError(err.message || "Failed to login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneNumber.startsWith("+91") ? phoneNumber : `+91${phoneNumber}`,
          name,
          isSignup: true
        }),
      });

      const data = await res.json();

      if (data.isBlocked) {
        setBlockedModalOpen(true);
        return;
      }

      if (data.success) {
        try {
          const fullPhone = phoneNumber.startsWith("+91") ? phoneNumber : `+91${phoneNumber}`;
          let registered = [];
          const savedReg = localStorage.getItem("registered_phone_numbers");
          if (savedReg) registered = JSON.parse(savedReg);
          if (!registered.includes(fullPhone)) registered.push(fullPhone);
          localStorage.setItem("registered_phone_numbers", JSON.stringify(registered));
        } catch (e) { }

        await loginWithCustomToken(data.customToken, "customer");
        router.push("/");
      } else {
        setError(data.error || "An error occurred");
      }
    } catch (err) {
      setError("Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmLogout = async () => {
    await logout();
    setShowLogoutModal(false);
  };

  const saveName = async () => {
    if (!editedName.trim()) {
      setSaveSuccessMsg("");
      setSaveErrorMsg("Please enter a valid name.");
      return;
    }

    setSaveSuccessMsg("");
    setSaveErrorMsg("");
    setIsSavingName(true);

    try {
      const updatedUser = { ...user, displayName: editedName.trim() };

      // Update in Firestore users collection via API
      const res = await fetch("/api/auth/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: user.phoneNumber,
          name: editedName.trim(),
          isSignup: true
        }),
      });

      const data = await res.json();

      if (res.ok && (data.success || data.user)) {
        // No longer store mock customer user in localStorage
        if (data.customToken) {
          await loginWithCustomToken(data.customToken, "customer");
        }
        setSaveSuccessMsg("Your name has been updated successfully.");

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          setSaveSuccessMsg("");
        }, 4000);
      } else {
        setSaveErrorMsg(data.error || "Failed to update name. Please try again.");
      }
    } catch (e) {
      setSaveErrorMsg("Failed to update name. Please try again.");
    } finally {
      setIsSavingName(false);
    }
  };

  // Logged-in View
  if (user) {
    return (
      <div className="p-4 sm:p-6 max-w-lg mx-auto w-full h-full animate-fade-in flex flex-col gap-6 font-sans">
        <h1 className="text-3xl font-serif font-bold text-forest mb-2">My Profile</h1>

        {saveSuccessMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium px-4 py-3 rounded-xl flex items-center gap-2.5 shadow-sm transition-all animate-fade-in">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {saveErrorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-xl flex items-center gap-2.5 shadow-sm transition-all animate-fade-in">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <span>{saveErrorMsg}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border-main flex flex-col gap-5">
          <div className="flex items-center gap-4 border-b border-border-main pb-5">
            <div className="w-16 h-16 rounded-full bg-cream border border-border-main flex items-center justify-center text-forest shrink-0">
              <User size={32} />
            </div>
            <div className="flex-1">
              {/*  <span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Customer Account</span>*/}
              <p className="text-sm font-bold text-forest">{user.displayName}</p>
              <p className="text-sm font-bold text-forest">{user.phoneNumber}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">


            <div>
              {/* <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Mobile Number</label> */}
              <p className="text-xs font-bold text-text-muted tracking-wider block mb-1">Mobile number cannot be changed</p>
              <Input
                value={user.phoneNumber || ""}
                disabled
                className="bg-cream/50 cursor-not-allowed font-mono text-text-muted"
              />
            </div>

            <div>
              {/* <label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Name</label> */}
              <p className="text-xs font-bold text-text-muted tracking-wider block mb-1">You can update your name anytime.</p>
              <div>
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Your Name"
                />
                <br />
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={saveName}
                    disabled={isSavingName}
                    className="shrink-0 center text-center"
                  >
                    {isSavingName ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>

        <Button
          variant="outline"
          className="mt-2 gap-2 border-red-500 text-red-600 hover:bg-red-50 h-12"
          onClick={() => setShowLogoutModal(true)}
        >
          <LogOut size={18} />
          Logout
        </Button>

        <Modal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} title="Logout">
          <div className="py-4 font-sans">
            <p className="text-text-main text-base font-semibold text-center mb-6">Are you sure you want to logout?</p>
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowLogoutModal(false)}>No</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold" onClick={confirmLogout}>Yes, logout</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // Not Logged-in View
  return (
    <div className="flex items-center justify-center h-full p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-sm border border-border-main p-6 animate-fade-in">
        {!isSignupStep ? (
          <>
            <div className="flex items-center gap-3 mb-2">
              <img
                src="/oats_co_logo.png"
                alt="Oats & Co. Logo"
                className="w-10 h-10 rounded-full object-cover border border-emerald-200/60 shadow-2xs shrink-0"
              />
              <div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-forest">Login</h1>
                <p className="text-xs text-text-muted font-sans font-medium">Oats & Co. Customer</p>
              </div>
            </div>
            <p className="text-text-muted font-sans mb-6 text-sm">Enter your phone number to continue</p>

            <form onSubmit={handleContinue} className="flex flex-col gap-4">
              <div className="flex gap-2">
                <div className="bg-cream border border-border-main rounded-lg px-4 flex items-center justify-center font-bold text-forest shrink-0">
                  +91
                </div>
                <Input
                  placeholder="Phone number"
                  type="tel"
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  error={error}
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Please wait..." : "Continue"}
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignupStep(false);
                  setError("");
                }}
                className="p-2 -ml-2 text-forest hover:bg-forest/10 rounded-full transition-colors cursor-pointer shrink-0"
                title="Back to Login"
              >
                <ArrowLeft size={22} />
              </button>
              <img
                src="/oats_co_logo.png"
                alt="Oats & Co. Logo"
                className="w-10 h-10 rounded-full object-cover border border-emerald-200/60 shadow-2xs shrink-0"
              />
              <div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-forest">Signup</h1>
                <p className="text-xs text-text-muted font-sans font-medium">Oats & Co. Customer</p>
              </div>
            </div>
            <p className="text-text-muted font-sans mb-6 text-sm">Create an account with the new phone number</p>

            <form onSubmit={handleSignup} className="flex flex-col gap-4">
              <div className="flex gap-2">
                <div className="bg-cream border border-border-main rounded-lg px-4 flex items-center justify-center font-bold text-forest shrink-0 opacity-70">
                  +91
                </div>
                <Input
                  value={phoneNumber}
                  disabled
                  className="bg-gray-50 font-mono text-text-muted"
                />
              </div>

              <Input
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={error}
              />

              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Account"}
              </Button>
            </form>
          </>
        )}
      </div>

      {/* Blocked Customer Alert Modal */}
      <Modal isOpen={blockedModalOpen} onClose={() => setBlockedModalOpen(false)} title="Notice">
        <div className="py-4 font-sans text-center">
          <p className="text-text-main text-base font-semibold mb-6">
            You are blocked due to some suspicious activity. You can't login
          </p>
          <Button className="w-full bg-forest text-white font-bold h-11" onClick={() => setBlockedModalOpen(false)}>
            Ok
          </Button>
        </div>
      </Modal>
    </div>
  );
}
