// app/forgot-password/page.js
"use client";
import { useState, useEffect, useRef } from "react";
import { auth } from "../lib/firebase";
import { confirmPasswordReset } from "firebase/auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-provider";

export default function ForgotPassword() {
  const { userData } = useAuth();

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);     
  const router = useRouter();

  const hasInitialized = useRef(false);

  // FIX: Automatically fetch and fill username if user is logged in
  useEffect(() => {
    if (userData?.username && !hasInitialized.current) {
      setUsername(userData.username);
      hasInitialized.current = true;
    }
  }, [userData]);

  // STEP 1: Send OTP
  const handleSendOtp = async (e) => {
    // FIX: e.preventDefault() ensures OTP is only sent on button click
    if (e) e.preventDefault(); 

    // ✅ Frontend guard: if we already sent, don't call API again
    if (otpSent) {
      setMessage("OTP already sent. Please check WhatsApp or use Resend after some time.");
      return;
    }

    if (loading) return;

    setLoading(true);
    setMessage("");

    const targetUsername = username.trim();

    if (!targetUsername) {
      setMessage("Please enter your username.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: targetUsername }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("OTP sent to your registered WhatsApp number. Check your messages.");
        setStep(2);
        setOtpSent(true);          
      } else {
        setMessage(data.error || "Failed to send OTP. Please check your username.");
        setStep(1);
      }
    } catch (err) {
      setMessage("Network error occurred.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (otp.length !== 6) {
      setMessage("Please enter the 6-digit OTP.");
      setLoading(false);
      return;
    }

    try {
      const targetUsername = username.trim();

      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: targetUsername, otp }),
      });

      if (res.ok) {
        setMessage("OTP verified. You can now set your new password.");
        setStep(3);
      } else {
        const data = await res.json();
        setMessage(data.error || "Invalid or expired OTP.");
      }
    } catch (err) {
      setMessage("Network error occurred during verification.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      const targetUsername = username.trim();

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: targetUsername, newPassword }),
      });

      if (res.ok) {
        alert("Password successfully reset! Please log in.");
        router.push("/Login");
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to reset password.");
      }
    } catch (err) {
      setMessage("Network error during password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-layout bg-[#E2F4EF] flex items-center justify-center relative">
      <div className="animated-background">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="particle"></div>
        ))}
      </div>

      <div className="w-full max-w-sm my-8 glass-container shadow-2xl z-10 p-8">
        <h1 className="text-3xl font-extrabold text-primary mb-2 text-center">
          Forgot Password
        </h1>
        <p className="text-gray-500 mb-8 text-center text-sm">
          {step === 1 ? "Step 1 of 3" : step === 2 ? "Step 2 of 3" : "Step 3 of 3"}
        </p>

        {message && (
          <div
            className={`p-3 my-4 rounded-lg text-sm font-semibold ${
              message.includes("success") || message.includes("sent")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="w-full">
            <p className="text-sm text-gray-600 mb-4">
              Enter your username to receive a verification code on WhatsApp.
            </p>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-style"
              placeholder="Your Username"
              autoFocus={!username}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-4"
            >
              {loading ? "Sending OTP..." : "Send OTP via WhatsApp"}
            </button>
          </form>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <p className="text-sm text-gray-600 mb-4">
              A 6-digit code has been sent to your phone ending in **
              {userData?.phone?.slice(-4) || "..."}**.
            </p>
            <input
              type="number"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="input-style"
              placeholder="6-Digit OTP"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-4"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
            <button
              type="button"
              onClick={(e) => {
                // allow resend manually AND reset otpSent so API can be hit again
                setOtpSent(false);
                handleSendOtp(e);
              }}
              className="w-full text-sm text-gray-500 hover:underline mt-3"
            >
              Resend OTP
            </button>
          </form>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <p className="text-sm text-gray-600 mb-4">
              Enter your new password for user **{username}**.
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-style"
              placeholder="New Password (min 6 characters)"
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-4"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}