import { prisma } from "@/lib/prisma";
import InvoiceClient from "./InvoiceClient";

export const dynamic = "force-dynamic";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">Invoice not found</h1>
        <p className="mt-2 text-sm text-gray-600">
          This invoice link may be invalid or expired.
        </p>
      </div>
    );
  }

  // Convert BigInt for client component
  const safeInvoice = {
    ...invoice,
    amountSats: invoice.amountSats.toString(),
  };

  return <InvoiceClient invoice={safeInvoice} />;
}
