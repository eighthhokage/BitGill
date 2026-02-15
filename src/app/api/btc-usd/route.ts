import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Simple in-memory cache (per server instance)
let cached: { usdPerBtc: number; ts: number } | null = null;
const TTL_MS = 60_000; // 60s

export async function GET() {
  try {
    const now = Date.now();
    if (cached && now - cached.ts < TTL_MS) {
      return NextResponse.json({ usdPerBtc: cached.usdPerBtc, cached: true });
    }

    // Coinbase public exchange rates endpoint (no auth required)
    const res = await fetch("https://api.coinbase.com/v2/exchange-rates?currency=BTC", {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Rate fetch failed: ${text}` }, { status: 502 });
    }

    const json = await res.json();
    const usdStr = json?.data?.rates?.USD;
    const usdPerBtc = Number(usdStr);

    if (!Number.isFinite(usdPerBtc) || usdPerBtc <= 0) {
      return NextResponse.json({ error: "Invalid rate from provider" }, { status: 502 });
    }

    cached = { usdPerBtc, ts: now };

    return NextResponse.json({ usdPerBtc, cached: false });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Rate error" }, { status: 503 });
  }
}
