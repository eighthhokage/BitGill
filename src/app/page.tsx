"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type CreateInvoiceResponse = {
  slug: string;
};

export default function HomePage() {
  const [receiveAddress, setReceiveAddress] = useState("");
  const [amountSats, setAmountSats] = useState("10000");
  const [memo, setMemo] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [requiredConfirmations, setRequiredConfirmations] = useState<1 | 2 | 3>(1);

  const [usdPerBtc, setUsdPerBtc] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch BTC->USD once on mount
  useEffect(() => {
    let cancelled = false;

    fetch("/api/btc-usd")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && typeof data?.usdPerBtc === "number") setUsdPerBtc(data.usdPerBtc);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const addr = receiveAddress.trim();
    if (!addr) return setError("Receiving address is required.");

    const satsNum = Number(amountSats);
    if (!Number.isFinite(satsNum) || satsNum <= 0) {
      return setError("Amount must be a positive number.");
    }

    if (satsNum < 10000) {
      return setError("For reliability (fees/dust), try 10,000 sats or more.");
    }

    // ✅ Optional: allow up to 2 comma-separated emails
    const emails = notifyEmail
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (emails.length > 2) {
      return setError("You can only send receipts to up to 2 email addresses (comma-separated).");
    }
    if (emails.some((e) => !e.includes("@"))) {
      return setError("One of the emails looks invalid.");
    }

    try {
      setLoading(true);

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiveAddress: addr,
          amountSats: Math.floor(satsNum),
          memo: memo.trim() || undefined,
          // ✅ normalized notifyEmail string, or undefined
          notifyEmail: emails.length ? emails.join(", ") : undefined,
          requiredConfirmations,
        }),
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        setError(data?.error ?? "Failed to create invoice.");
        return;
      }

      const created = data as CreateInvoiceResponse;
      window.location.href = `/i/${created.slug}`;
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Check your dev server logs.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <Image src="/logo-small.png" alt="BitGill logo" width={56} height={56} priority />
            <h1 className="text-3xl font-semibold">BitGill</h1>
          </div>
          <p className="text-sm text-gray-600">
            Welcome to BitGill, a free Bitcoin invoice generator by HarvestBTC.
          </p>
        </header>

        <div className="rounded-2xl border p-5 shadow-sm">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium mb-1">Receiving address</label>
              <input
                className="w-full rounded-lg border px-3 py-2 bg-transparent"
                placeholder="bc1q..."
                value={receiveAddress}
                onChange={(e) => setReceiveAddress(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Amount (sats)</label>
              <input
                className="w-full rounded-lg border px-3 py-2 bg-transparent"
                inputMode="numeric"
                placeholder="10000"
                value={amountSats}
                onChange={(e) => setAmountSats(e.target.value)}
              />

              <p className="mt-1 text-xs text-gray-500">
                Tip: 10,000 sats+ is recommended for reliable on-chain sends.
              </p>

              {usdPerBtc ? (
                <p className="mt-1 text-xs text-gray-500">
                  ≈{" "}
                  {(() => {
                    const n = Number(amountSats);
                    if (!Number.isFinite(n) || n <= 0) return "—";
                    const usd = (n / 100_000_000) * usdPerBtc;
                    return usd.toLocaleString(undefined, { style: "currency", currency: "USD" });
                  })()}{" "}
                  <span className="text-gray-400">(estimate)</span>
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Memo (optional)</label>
              <input
                className="w-full rounded-lg border px-3 py-2 bg-transparent"
                placeholder="What’s this for?"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={140}
              />
            </div>

            {/* ✅ Updated email field + helper text */}
            <div>
              <label className="block text-sm font-medium mb-1">Email for receipt (optional)</label>
              <input
                className="w-full rounded-lg border px-3 py-2 bg-transparent"
                placeholder="name@email.com, other@email.com"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                autoComplete="email"
              />
              <p className="mt-1 text-xs text-gray-500">
                You can enter up to <span className="font-medium">2</span> email addresses,
                separated by a comma.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Confirmations required</label>
              <select
                className="w-full rounded-lg border px-3 py-2 bg-transparent"
                value={requiredConfirmations}
                onChange={(e) => setRequiredConfirmations(Number(e.target.value) as 1 | 2 | 3)}
              >
                <option value={1} className="bg-black text-white">
                  1 confirmation (fast)
                </option>
                <option value={2} className="bg-black text-white">
                  2 confirmations
                </option>
                <option value={3} className="bg-black text-white">
                  3 confirmations
                </option>
              </select>
            </div>

            {error ? (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create invoice"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
