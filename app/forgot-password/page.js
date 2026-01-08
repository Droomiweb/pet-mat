// app/forgot-password/page.js
"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../auth-provider";

// Icons
const LockClosedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-[#4A90E2]"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400"><path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" /></svg>;
const KeyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>;
const ShieldCheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
const ArrowLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>;

export default function ForgotPassword() {
  const { userData } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (userData?.username && !hasInitialized.current) {
      setUsername(userData.username);
      hasInitialized.current = true;
    }
  }, [userData]);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (otpSent) {
      setMessage("OTP already sent. Please check WhatsApp.");
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
        setMessage("OTP sent to your registered WhatsApp number.");
        setStep(2);
        setOtpSent(true);
      } else {
        setMessage(data.error || "Failed to send OTP.");
        setStep(1);
      }
    } catch (err) {
      setMessage("Network error occurred.");
    } finally {
      setLoading(false);
    }
  };

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
        const res = await fetch("/api/auth/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: username.trim(), otp }),
        });

      if (res.ok) {
        setMessage("OTP verified. Set your new password.");
        setStep(3);
      } else {
        const data = await res.json();
        setMessage(data.error || "Invalid OTP.");
      }
    } catch (err) {
      setMessage("Network error during verification.");
    } finally {
      setLoading(false);
    }
  };

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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), newPassword }),
      });

      if (res.ok) {
        alert("Password reset successfully! Please login.");
        router.push("/Login");
      } else {
        const data = await res.json();
        setMessage(data.error || "Failed to reset password.");
      }
    } catch (err) {
      setMessage("Network error during reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] flex flex-col justify-center items-center p-4 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute top-10 right-10 w-32 h-32 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-32 h-32 bg-pink-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden relative z-10 border border-gray-100">
            {/* Header */}
            <div className="bg-white p-8 pb-0 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-full mb-6 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-pulse"></div>
                    <LockClosedIcon />
                </div>
                <h1 className="text-2xl font-black text-gray-800 tracking-tight">Forgot Password?</h1>
                <p className="text-gray-500 mt-2 text-sm">
                    {step === 1 && "Don't worry, it happens! Enter your username to verify."}
                    {step === 2 && "We sent a 6-digit code to your WhatsApp."}
                    {step === 3 && "Almost there! Create a new secure password."}
                </p>
            </div>

            {/* Error/Success Message */}
             {message && (
                <div className={`mx-8 mt-6 p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${message.toLowerCase().includes("sent") || message.toLowerCase().includes("verified") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                   <span className="text-lg">{message.toLowerCase().includes("sent") || message.toLowerCase().includes("verified") ? "✅" : "⚠️"}</span>
                   {message}
                </div>
            )}

            <div className="p-8 pt-6">
                {/* Steps */}
                {step === 1 && (
                    <form onSubmit={handleSendOtp} className="space-y-5">
                       <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <UserIcon />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent outline-none transition-all placeholder:text-gray-400 font-medium group-hover:bg-gray-100/50"
                                placeholder="Enter Username"
                                autoFocus={!username}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all transform active:scale-[0.98] ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-[#4A90E2] to-[#3A75B9] hover:from-[#3A75B9] hover:to-[#2960A0]"}`}
                        >
                            {loading ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> Sending...</span> : "Send Verification Code"}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOtp} className="space-y-5">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <ShieldCheckIcon />
                            </div>
                            <input
                                type="number"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent outline-none transition-all placeholder:text-gray-400 font-medium tracking-widest"
                                placeholder="Enter 6-digit OTP"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all transform active:scale-[0.98] ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-[#4A90E2] to-[#3A75B9] hover:from-[#3A75B9] hover:to-[#2960A0]"}`}
                        >
                             {loading ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> Verifying...</span> : "Verify & Continue"}
                        </button>

                         <button
                            type="button"
                            onClick={(e) => { setOtpSent(false); handleSendOtp(e); }}
                            className="w-full text-center text-xs font-bold text-gray-400 hover:text-[#4A90E2] transition-colors mt-2"
                        >
                            Didn't receive code? Resend
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetPassword} className="space-y-5">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <KeyIcon />
                            </div>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent outline-none transition-all placeholder:text-gray-400 font-medium"
                                placeholder="New Password (min 6 chars)"
                                required
                                minLength={6}
                            />
                        </div>

                         <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all transform active:scale-[0.98] ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-[#4A90E2] to-[#3A75B9] hover:from-[#3A75B9] hover:to-[#2960A0]"}`}
                        >
                             {loading ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> Updating...</span> : "Reset Password"}
                        </button>
                    </form>
                )}
            </div>
            
            <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
                <Link href="/Login" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 font-bold text-xs transition-colors">
                     <ArrowLeftIcon /> Back to Login
                </Link>
            </div>
        </div>
    </div>
  );
}