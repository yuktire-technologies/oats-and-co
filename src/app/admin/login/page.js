"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1: Login, 2: OTP, 3: Forgot Password OTP
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(59);
  const [idToken, setIdToken] = useState("");

  const router = useRouter();


  useEffect(() => {
    let interval;
    if ((step === 2 || step === 3) && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      // 1. Try Firebase Auth
      let token = "";
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        token = await userCredential.user.getIdToken();
      } catch (fbErr) {
        throw fbErr;
      }

      setIdToken(token);

      // 2. Request OTP
      const res = await fetch("/api/admin/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token, action: "login" }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStep(2);
        setTimer(59);
      } else {
        setError(data.error || "Failed to send OTP");
      }
    } catch (err) {
      setError("Invalid credentials or user not found.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setError("Please enter a valid OTP");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, otp }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Logged in securely
        router.push("/admin/orders");
      } else {
        setError(data.error || "Invalid OTP");
      }
    } catch (err) {
      setError("Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setTimer(59);
    try {
      await fetch("/api/admin/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, action: step === 2 ? "login" : "reset" }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email first");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "reset" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStep(3);
        setTimer(59);
      } else {
        setError(data.error || "Failed to send reset OTP");
      }
    } catch (e) {
      setError("Failed to send reset OTP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-cream justify-between relative">
      {/* Mobile Top Left Header with Logo */}
      <div className="sm:hidden flex items-center gap-2.5 px-4 py-3 border-b border-border-main bg-ivory shadow-2xs">
        <img
          src="/oats_co_logo.png"
          alt="Oats & Co. Logo"
          className="w-8 h-8 rounded-full object-cover border border-emerald-200/60 shadow-2xs"
        />
        <span className="font-serif font-bold text-forest text-lg tracking-tight">Oats & Co.</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-ivory border border-border-main rounded-3xl p-8 sm:p-10 w-full max-w-md shadow-2xl animate-fade-in">
          <div className="text-center mb-8 flex flex-col items-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img
                src="/oats_co_logo.png"
                alt="Oats & Co. Logo"
                className="w-10 h-10 rounded-full object-cover border border-emerald-200/60 shadow-2xs"
              />
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-forest">Oats & Co. Admin</h1>
            </div>
            <p className="text-text-muted font-sans text-sm">Secure Portal Access</p>
          </div>

          {step === 1 && (
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              {error && <p className="text-red-500 text-sm font-sans font-semibold">{error}</p>}

              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-forest text-sm font-sans font-bold hover:underline"
                  onClick={handleForgotPassword}
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" disabled={isLoading} className="h-12 text-lg w-full">
                {isLoading ? "Authenticating..." : "Login"}
              </Button>
            </form>
          )}

          {(step === 2 || step === 3) && (
            <form onSubmit={handleVerifyOTP} className="flex flex-col gap-5">
              <h2 className="text-xl font-serif font-bold text-text-main mb-2">Enter OTP</h2>
              <p className="text-text-muted text-sm font-sans mb-4">
                We've sent a one-time password to your email.
              </p>
              <Input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                maxLength={6}
              />
              {error && <p className="text-red-500 text-sm font-sans font-semibold">{error}</p>}

              <Button type="submit" disabled={isLoading} className="h-12 text-lg w-full">
                {isLoading ? "Verifying..." : "Verify OTP"}
              </Button>

              <div className="text-center mt-4 text-sm font-sans">
                {timer > 0 ? (
                  <span className="text-text-muted">Resend OTP in {timer}s</span>
                ) : (
                  <button type="button" onClick={handleResendOTP} className="text-forest font-bold hover:underline">
                    Resend OTP
                  </button>
                )}
              </div>

              <div className="text-center mt-2">
                <button type="button" onClick={() => { setStep(1); setOtp(""); }} className="text-text-muted text-xs hover:underline">
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
