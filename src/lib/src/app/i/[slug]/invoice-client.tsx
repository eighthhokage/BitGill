"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

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

export default function InvoiceClient({ invoice }: { invoice: Invoice }) {
  const [state, setState] = useState<Invoice>(invoice);
  const [confirmations, setConfirmations] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  const sats = useMemo(() => BigInt(state.amountSats), [state.amountSats]);
  const bip21 = useMemo(
    () => buildBip21(state.receiveAddress, sats, state.memo),
    [state.receiveAddress, sats, state.memo]
  );

  async function checkNow() {
    try {
      setChecking(true);
      const res = await fetch(`/api/invoices/${state.slug}/check`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Check failed");

      setState((prev) => ({
        ...prev,
        status: data.status,
        txid: data.txid ?? null,
        blockHeight: data.blockHeight ?? null,
        finalizedAt: data.finalizedAt ?? null,
      }));
      setConfirmations(typeof data.confirmations === "number" ? data.confirmations : null);
      setLastCheckedAt(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  }

  // Poll until finalized (or until we have a confirmed tx with enough confs)
  useEffect(() => {
    if (state.status === "FINALIZED") return;

    // poll every 15s
    const id = setInterval(() => {
      checkNow();
    }, 15_000);

    // do an immediate check on load
    checkNow();

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.slug]);

  return (
    <div className="min-h-screen p-6 flex justify-center">
      <div className="w-full max-w-xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Bitcoin Invoice</h1>
          <p className="text-sm text-gray-600">Pay on-chain to the address below.</p>
        </header>

        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex justify-between gap-4">
            <div>
              <div className="text-sm text-gray-600">Amount</div>
              <div className="text-lg font-medium">{state.amountSats} sats</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Status</div>
              <div className="text-lg font-medium">{state.status}</div>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Receiving address</div>
            <div className="font-mono text-sm break-all">{state.receiveAddress}</div>
          </div>

          {state.memo ? (
            <div>
              <div className="text-sm text-gray-600">Memo</div>
              <div className="text-sm">{state.memo}</div>
            </div>
          ) : null}

          <div className="pt-2">
            <div className="text-sm text-gray-600 mb-2">Scan QR</div>
            <div className="flex justify-center rounded-lg border p-4 bg-white">
              <QRCodeCanvas value={bip21} size={220} includeMargin />
            </div>

            <div className="mt-3 space-y-2">
              <a
                className="inline-block text-blue-600 underline"
                href={bip21}
              >
                Open in wallet
              </a>

              <div className="text-xs text-gray-500 break-all">
                BIP21: <span className="font-mono">{bip21}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Confirmations required</div>
              <div className="font-medium">{state.requiredConfirmations}</div>
            </div>

            <button
              onClick={checkNow}
              disabled={checking}
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {checking ? "Checking..." : "Refresh status"}
            </button>
          </div>

          {state.txid ? (
            <div className="pt-2">
              <div className="text-sm text-gray-600">Transaction ID</div>
              <div className="font-mono text-sm break-all">{state.txid}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-600 pt-2">
              Waiting to detect a transaction to this address…
            </div>
          )}

          {state.blockHeight ? (
            <div>
              <div className="text-sm text-gray-600">Block height</div>
              <div className="font-mono text-sm">{state.blockHeight}</div>
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

        <footer className="text-xs text-gray-500">
          Note: “FINALIZED” means the transaction reached the required confirmations.
        </footer>
      </div>
    </div>
  );
}
