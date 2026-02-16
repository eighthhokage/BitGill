"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

function mempoolBaseUrl(network: string) {
  if (!network || network === "mainnet") return "https://mempool.space";
  if (network === "testnet") return "https://mempool.space/testnet";
  if (network === "signet") return "https://mempool.space/signet";
  return "https://mempool.space";
}

type Invoice = {
  slug: string;
  network: string;
  receiveAddress: string;
  amountSats: string; // BigInt -> string
  memo: string | null;
  notifyEmail: string | null;
  requiredConfirmations: number;
  status: string;
  txid: string | null;
  blockHeight: number | null;
  createdAt: string | Date;
  expiresAt: string | Date | null;
  finalizedAt: string | Date | null;
};

function satsToBtcString(sats: bigint): string {
  const SATS_PER_BTC = 100_000_000n;
  const whole = sats / SATS_PER_BTC;
  const frac = sats % SATS_PER_BTC;

  const fracStr = frac.toString().padStart(8, "0").replace(/0+$/, "");
  return fracStr.length ? `${whole.toString()}.${fracStr}` : whole.toString();
}

function buildBip21(address: string, sats: bigint, memo?: string | null) {
  const btc = satsToBtcString(sats);
  const params = new URLSearchParams();
  params.set("amount", btc);
  if (memo && memo.trim().length) params.set("message", memo.trim());
  const qs = params.toString();
  return qs ? `bitcoin:${address}?${qs}` : `bitcoin:${address}`;
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

export default function InvoiceClient({ invoice }: { invoice: Invoice }) {
  const [state, setState] = useState<Invoice>(invoice);
  const [confirmations, setConfirmations] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const isExpired = state.status === "EXPIRED";
  const isTerminal = state.status === "FINALIZED" || state.status === "EXPIRED";

  // Small UI hint when polling fails (instead of console spam)
  const [pollError, setPollError] = useState<string | null>(null);

  // Prevent overlapping checks
  const inFlightRef = useRef(false);

  // USD rate state
  const [usdPerBtc, setUsdPerBtc] = useState<number | null>(null);

  // Fetch USD rate once on mount
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

  async function onCopy(label: string, value: string) {
    try {
      await copyToClipboard(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1200);
    } catch (e) {
      console.warn(e);
    }
  }

  const sats = useMemo(() => BigInt(state.amountSats), [state.amountSats]);

  const bip21 = useMemo(
    () => buildBip21(state.receiveAddress, sats, state.memo),
    [state.receiveAddress, sats, state.memo]
  );

  const mempoolBase = useMemo(() => mempoolBaseUrl(state.network), [state.network]);

  // Compute USD estimate
  const usdEstimate = useMemo(() => {
    if (!usdPerBtc) return null;
    const satsNum = Number(state.amountSats);
    if (!Number.isFinite(satsNum) || satsNum <= 0) return null;
    const usd = (satsNum / 100_000_000) * usdPerBtc;
    if (!Number.isFinite(usd)) return null;
    return usd;
  }, [usdPerBtc, state.amountSats]);

  async function checkNow() {
    if (inFlightRef.current || isTerminal) return;

    inFlightRef.current = true;
    setChecking(true);

    try {
      const res = await fetch(`/api/invoices/${state.slug}/check`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Check failed");

      setPollError(null);

      setState((prev) => ({
        ...prev,
        status: data.status,
        txid: data.txid ?? null,
        blockHeight: data.blockHeight ?? null,
        finalizedAt: data.finalizedAt ?? null,
      }));

      setConfirmations(typeof data.confirmations === "number" ? data.confirmations : null);
      setLastCheckedAt(new Date().toLocaleTimeString());
    } catch (e: any) {
      // Don’t spam console (Next overlay can get annoying). Show a tiny hint instead.
      setPollError("Network hiccup — retrying…");
    } finally {
      setChecking(false);
      inFlightRef.current = false;
    }
  }

  // ✅ Spam reduction polling:
  // - No txid yet: 45s
  // - Have txid: 15s
  useEffect(() => {
    if (isTerminal) return;

    const pollMs = state.txid ? 15_000 : 45_000;

    // immediate check on load / when txid status changes
    checkNow();

    const id = setInterval(() => {
      checkNow();
    }, pollMs);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.slug, state.txid, state.status]);

  return (
    <div className="min-h-screen p-6 flex justify-center">
      <div className="w-full max-w-xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Bitcoin Invoice</h1>
          <p className="text-sm text-gray-600">Pay on-chain to the address below.</p>
        </header>

        {/* ✅ Friendly EXPIRED banner */}
        {isExpired ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <div className="font-medium">This invoice has expired.</div>
            <div className="mt-1 text-amber-800">
              Create a new invoice to generate a fresh payment request.
            </div>
            <div className="mt-3">
              <a
                href="/"
                className="inline-flex items-center rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium hover:bg-amber-100"
              >
                Create a new invoice
              </a>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex justify-between gap-4">
            <div>
              <div className="text-sm text-gray-600">Amount</div>
              <div className="text-lg font-medium">{state.amountSats} sats</div>

              {usdEstimate !== null ? (
                <div className="text-xs text-gray-500">
                  ≈ ${usdEstimate.toFixed(2)} USD{" "}
                  <span className="text-gray-400">(estimate)</span>
                </div>
              ) : null}
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-600">Status</div>
              <div className="text-lg font-medium">{state.status}</div>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Receiving address</div>
            <div className="font-mono text-sm break-all">{state.receiveAddress}</div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => onCopy("Address copied", state.receiveAddress)}
                className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Copy address
              </button>

              <button
                type="button"
                onClick={() =>
                  onCopy("Invoice link copied", `${window.location.origin}/i/${state.slug}`)
                }
                className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              >
                Copy invoice link
              </button>

              {!isExpired ? (
                <button
                  type="button"
                  onClick={() => onCopy("BIP21 copied", bip21)}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Copy BIP21 (QR Text)
                </button>
              ) : null}
            </div>

            {copied ? <div className="text-xs text-green-600 pt-2">{copied}</div> : null}
          </div>

          {state.memo ? (
            <div>
              <div className="text-sm text-gray-600">Memo</div>
              <div className="text-sm">{state.memo}</div>
            </div>
          ) : null}

          {!isExpired ? (
            <div className="pt-2">
              <div className="text-sm text-gray-600 mb-2">Scan QR</div>
              <div className="flex justify-center rounded-lg border p-4 bg-white">
                <QRCodeCanvas value={bip21} size={220} includeMargin />
              </div>

              <div className="mt-3 space-y-2">
                <a className="inline-block text-blue-600 underline" href={bip21}>
                  Open in wallet
                </a>

                <div className="text-xs text-gray-500 break-all">
                  BIP21: <span className="font-mono">{bip21}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-2 text-sm text-gray-600">
              Payment link disabled because this invoice expired.
            </div>
          )}
        </div>

        <div className="rounded-xl border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Confirmations required</div>
              <div className="font-medium">{state.requiredConfirmations}</div>
            </div>

            <button
              onClick={checkNow}
              disabled={checking || isExpired}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {checking ? "Checking..." : "Refresh status"}
            </button>
          </div>

          {pollError ? <div className="text-xs text-gray-500">{pollError}</div> : null}

          {state.txid ? (
            <div className="pt-2 space-y-1">
              <div className="text-sm text-gray-600">Transaction ID</div>
              <a
                className="font-mono text-sm break-all text-blue-600 underline"
                href={`${mempoolBase}/tx/${state.txid}`}
                target="_blank"
                rel="noreferrer"
              >
                {state.txid}
              </a>
            </div>
          ) : (
            <div className="text-sm text-gray-600 pt-2">
              {isExpired
                ? "This invoice has expired."
                : "Waiting to detect a transaction to this address…"}
            </div>
          )}

          {state.blockHeight ? (
            <div className="space-y-1">
              <div className="text-sm text-gray-600">Block height</div>
              <a
                className="font-mono text-sm text-blue-600 underline"
                href={`${mempoolBase}/block/${state.blockHeight}`}
                target="_blank"
                rel="noreferrer"
              >
                {state.blockHeight}
              </a>
            </div>
          ) : null}

          {typeof confirmations === "number" ? (
            <div>
              <div className="text-sm text-gray-600">Confirmations</div>
              <div className="font-mono text-sm">{confirmations}</div>
            </div>
          ) : null}

          {lastCheckedAt ? (
            <div className="text-xs text-gray-500">Last checked: {lastCheckedAt}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
