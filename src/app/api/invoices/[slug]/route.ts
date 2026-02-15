import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  const invoice = await prisma.invoice.findUnique({
    where: { slug },
    select: {
      slug: true,
      network: true,
      receiveAddress: true,
      amountSats: true,
      memo: true,
      notifyEmail: true,
      requiredConfirmations: true,
      status: true,
      txid: true,
      blockHeight: true,
      createdAt: true,
      expiresAt: true,
      finalizedAt: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...invoice,
    amountSats: invoice.amountSats.toString(),
  });
}
