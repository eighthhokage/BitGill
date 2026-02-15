import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resend, EMAIL_FROM } from "@/lib/email";
import { parseNotifyEmails } from "@/lib/notifyEmail";

export const runtime = "nodejs";

const ESPLORA = process.env.ESPLORA_BASE_URL || "https://mempool.space/api";

// --------------------
// Hardened fetch helpers
// --------------------
async function fetchJson<T>(url: string, tries = 3, timeoutMs = 10_000): Promise<T> {
  let lastErr: any = null;

  for (let attempt = 1; attempt <= tries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        headers: { accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Retry on rate-limit / transient server errors
      if ([429, 500, 502, 503, 504].includes(res.status) && attempt < tries) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Explorer error ${res.status}: ${text}`);
      }

      return (await res.json()) as T;
    } catch (err: any) {
      clearTimeout(timeout);
      lastErr = err;

      if (attempt < tries) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }
    }
  }

  throw lastErr ?? new Error("Explorer fetch failed");
}

async function fetchText(url: string, tries = 3, timeoutMs = 10_000): Promise<string> {
  let lastErr: any = null;

  for (let attempt = 1; attempt <= tries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if ([429, 500, 502, 503, 504].includes(res.status) && attempt < tries) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Explorer error ${res.status}: ${text}`);
      }

      return await res.text();
    } catch (err: any) {
      clearTimeout(timeout);
      lastErr = err;

      if (attempt < tries) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }
    }
  }

  throw lastErr ?? new Error("Explorer fetch failed");
}

// --------------------
// Types
// --------------------
type EsploraTx = {
  txid: string;
  vout: Array<{
    value: number; // sats
    scriptpubkey_address?: string;
  }>;
  status?: {
    confirmed: boolean;
    block_height?: number;
    block_time?: number; // unix seconds
  };
};

type TxStatus = {
  confirmed: boolean;
  block_height?: number;
};

function sumPaidToAddressSats(tx: EsploraTx, address: string): bigint {
  let sum = 0n;
  for (const v of tx.vout) {
    if (v.scriptpubkey_address === address) sum += BigInt(v.value);
  }
  return sum;
}

function mempoolBaseUrl(network: string) {
  if (!network || network === "mainnet") return "https://mempool.space";
  if (network === "testnet") return "https://mempool.space/testnet";
  if (network === "signet") return "https://mempool.space/signet";
  return "https://mempool.space";
}

export async function POST(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;

    const invoice = await prisma.invoice.findUnique({ where: { slug } });

    if (!invoice) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Terminal states -> return
    if (invoice.status === "FINALIZED" || invoice.status === "EXPIRED") {
      return NextResponse.json({
        slug: invoice.slug,
        status: invoice.status,
        txid: invoice.txid,
        blockHeight: invoice.blockHeight,
        finalizedAt: invoice.finalizedAt?.toISOString() ?? null,
        confirmations: null,
      });
    }

    let txid: string | null = invoice.txid ?? null;

    // Expire if past expiresAt AND we haven't detected a tx yet
    if (!txid && invoice.expiresAt) {
      const expiresAtMs =
        invoice.expiresAt instanceof Date
          ? invoice.expiresAt.getTime()
          : new Date(invoice.expiresAt as any).getTime();

      if (Number.isFinite(expiresAtMs) && expiresAtMs < Date.now()) {
        const expired = await prisma.invoice.update({
          where: { slug },
          data: { status: "EXPIRED" },
        });

        return NextResponse.json({
          slug,
          status: expired.status,
          txid: null,
          blockHeight: null,
          finalizedAt: null,
          confirmations: null,
        });
      }
    }

    // 1) If no txid yet, scan address txs and find a matching payment
    if (!txid) {
      const txs = await fetchJson<EsploraTx[]>(`${ESPLORA}/address/${invoice.receiveAddress}/txs`);

      const target = invoice.amountSats;

      // Anchor to invoice creation time to avoid matching old payments
      const createdAtSec = Math.floor(new Date(invoice.createdAt).getTime() / 1000);
      const GRACE_SEC = 60; // small buffer

      const candidateTxs = txs.filter((tx) => {
        const st = tx.status;

        // If tx is confirmed, only accept if its block_time is after invoice creation
        if (st?.confirmed) {
          if (typeof st.block_time !== "number") return false;
          return st.block_time >= createdAtSec - GRACE_SEC;
        }

        // If unconfirmed (mempool), allow it
        return true;
      });

      const match = candidateTxs.find(
        (tx) => sumPaidToAddressSats(tx, invoice.receiveAddress) >= target
      );

      if (!match) {
        return NextResponse.json({
          slug,
          status: invoice.status,
          txid: null,
          blockHeight: null,
          finalizedAt: null,
          confirmations: null,
        });
      }

      txid = match.txid;

      await prisma.invoice.update({
        where: { slug },
        data: { txid, status: "SEEN" },
      });
    }

    if (!txid) throw new Error("txid missing after match");

    // 2) If we have txid, check confirmation status
    const txStatus = await fetchJson<TxStatus>(`${ESPLORA}/tx/${txid}/status`);

    if (!txStatus.confirmed || !txStatus.block_height) {
      await prisma.invoice.update({ where: { slug }, data: { status: "SEEN" } });

      return NextResponse.json({
        slug,
        status: "SEEN",
        txid,
        blockHeight: null,
        finalizedAt: null,
        confirmations: 0,
      });
    }

    const blockHeight = txStatus.block_height;

    // 3) Compute confirmations (hardened)
    const tipText = await fetchText(`${ESPLORA}/blocks/tip/height`);
    const tip = Number(tipText);
    if (!Number.isFinite(tip)) throw new Error("Failed to parse chain tip height");

    const confirmations = tip - blockHeight + 1;

    // 4) Determine state
    if (confirmations >= invoice.requiredConfirmations) {
      const updated = await prisma.invoice.update({
        where: { slug },
        data: {
          status: "FINALIZED",
          blockHeight,
          finalizedAt: new Date(),
        },
      });

      // Send receipt once
      if (updated.notifyEmail && !updated.receiptSentAt) {
        const parsed = parseNotifyEmails(updated.notifyEmail, 2);

        if (!parsed.ok || parsed.emails.length === 0) {
          console.error(
            "notifyEmail invalid or not within 1-2 recipients; skipping receipt:",
            updated.notifyEmail,
            parsed.ok ? "" : `(${parsed.error})`
          );
        } else {
          const recipients = parsed.emails;

          const sats = updated.amountSats.toString();
          const subject = `Payment received: ${sats} sats`;

          const mempoolBase = mempoolBaseUrl(updated.network);
          const txUrl = `${mempoolBase}/tx/${txid}`;
          const blockUrl = `${mempoolBase}/block/${blockHeight}`;

          const html = `
            <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
              <h2>Bitgill receipt</h2>

              <p><strong>Amount:</strong> ${sats} sats</p>

              <p>
                <strong>Receiving address:</strong><br/>
                <code>${updated.receiveAddress}</code>
              </p>

              ${updated.memo ? `<p><strong>Memo:</strong> ${updated.memo}</p>` : ""}

              <hr/>

              <p>
                <strong>Transaction ID (txid):</strong><br/>
                <a href="${txUrl}">${txid}</a>
              </p>

              <p>
                <strong>Block height:</strong>
                <a href="${blockUrl}">${blockHeight}</a>
              </p>

              <p><strong>Confirmations:</strong> ${confirmations}</p>

              <p style="color:#666;font-size:12px;margin-top:24px;">
                This receipt was generated by Bitgill.
              </p>
            </div>
          `;

          const { error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: recipients, // ✅ string[]
            subject,
            html,
          });

          if (error) {
            console.error("Resend error:", error);
            // don't fail the API response if email fails
          } else {
            await prisma.invoice.update({
              where: { slug },
              data: {
                receiptSentAt: new Date(),
                receiptTxid: txid,
              },
            });
          }
        }
      }

      return NextResponse.json({
        slug,
        status: updated.status,
        txid: updated.txid,
        blockHeight: updated.blockHeight,
        finalizedAt: updated.finalizedAt?.toISOString() ?? null,
        confirmations,
      });
    }

    // Not enough confs yet, but confirmed
    await prisma.invoice.update({
      where: { slug },
      data: { status: "CONFIRMED", blockHeight },
    });

    return NextResponse.json({
      slug,
      status: "CONFIRMED",
      txid,
      blockHeight,
      finalizedAt: null,
      confirmations,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
