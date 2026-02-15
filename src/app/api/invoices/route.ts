import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseNotifyEmails, emailsToStoredValue } from "@/lib/notifyEmail";

function randomSlug(len = 10) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function isProbablyMainnetAddress(addr: string) {
  // MVP sanity check (not full checksum validation)
  return addr.startsWith("bc1") || addr.startsWith("1") || addr.startsWith("3");
}

function parseBigIntSafe(value: unknown): bigint | null {
  try {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return null;
      if (!Number.isInteger(value)) return null;
      return BigInt(value);
    }
    if (typeof value === "string") {
      const s = value.trim();
      if (!/^\d+$/.test(s)) return null;
      return BigInt(s);
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const receiveAddress = String(body.receiveAddress ?? "").trim();
    const amountSats = parseBigIntSafe(body.amountSats);
    const memo = body.memo ? String(body.memo).trim() : null;

    // ✅ shared notifyEmail parsing (up to 2 recipients)
    const parsed = parseNotifyEmails(body.notifyEmail, 2);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const notifyEmail = emailsToStoredValue(parsed.emails); // "a@x.com,b@y.com" or null

    const requiredConfirmations = Number(body.requiredConfirmations ?? 1);

    if (!receiveAddress) {
      return NextResponse.json({ error: "receiveAddress is required" }, { status: 400 });
    }

    if (!isProbablyMainnetAddress(receiveAddress)) {
      return NextResponse.json(
        { error: "receiveAddress must look like a mainnet Bitcoin address (bc1 / 1 / 3)" },
        { status: 400 }
      );
    }

    if (amountSats === null) {
      return NextResponse.json({ error: "amountSats must be an integer" }, { status: 400 });
    }

    if (amountSats < 10_000n) {
      return NextResponse.json(
        { error: "amountSats must be at least 10000 for reliability (fees/dust)" },
        { status: 400 }
      );
    }

    if (![1, 2, 3].includes(requiredConfirmations)) {
      return NextResponse.json(
        { error: "requiredConfirmations must be 1, 2, or 3" },
        { status: 400 }
      );
    }

    if (memo && memo.length > 140) {
      return NextResponse.json({ error: "memo must be 140 characters or less" }, { status: 400 });
    }

    // Expire invoices after 1.5 hours
    const expiresAt = new Date(Date.now() + 90 * 60 * 1000);

    let created: any = null;
    for (let i = 0; i < 5; i++) {
      const slug = randomSlug();
      try {
        created = await prisma.invoice.create({
          data: {
            slug,
            receiveAddress,
            amountSats,
            memo,
            notifyEmail,
            requiredConfirmations,
            status: "UNPAID",
            expiresAt,
          },
          select: {
            slug: true,
            receiveAddress: true,
            amountSats: true,
            memo: true,
            notifyEmail: true,
            requiredConfirmations: true,
            status: true,
            createdAt: true,
            expiresAt: true,
          },
        });
        break;
      } catch (e: any) {
        if (e?.code === "P2002") continue;
        throw e;
      }
    }

    if (!created) {
      return NextResponse.json({ error: "Failed to create invoice slug" }, { status: 500 });
    }

    return NextResponse.json(
      { ...created, amountSats: created.amountSats.toString() },
      { status: 201 }
    );
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  }
}
