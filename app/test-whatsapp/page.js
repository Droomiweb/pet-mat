"use client";

import { useState } from "react";

export default function TestWhatsApp() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!phone || !message) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/test-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message }),
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Green API – WhatsApp Tester
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 shadow-2xl shadow-emerald-500/10 backdrop-blur">
          <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-50">
                Send Test Message
              </h1>
              <p className="text-xs text-slate-400">
                Enter full WhatsApp number with country code (e.g. 918590814463)
              </p>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-300">
              Dev Mode
            </span>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-200">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="918590814463"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
              />
              <p className="text-xs text-slate-500">
                Don&apos;t add + or spaces – only digits.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-200">
                Message
              </label>
              <textarea
                rows={3}
                placeholder="Hello from my Next.js + Green API test 🚀"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 outline-none ring-0 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 resize-none"
              />
            </div>

            <button
              onClick={sendMessage}
              disabled={loading || !phone || !message}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-900 border-t-transparent" />
              )}
              {loading ? "Sending..." : "Send WhatsApp Message"}
            </button>
          </div>

          <div className="border-t border-slate-800 bg-slate-950/60 px-6 py-4">
            <p className="mb-2 text-xs font-medium text-slate-400">
              Response
            </p>
            <div className="max-h-48 overflow-auto rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-[11px] text-emerald-100 font-mono">
              {result ? (
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(result, null, 2)}
                </pre>
              ) : (
                <span className="text-slate-500">
                  Send a message to see the API response here.
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          Make sure your WhatsApp (linked to Green API) is online &amp; the
          target number has WhatsApp enabled.
        </p>
      </div>
    </main>
  );
}
