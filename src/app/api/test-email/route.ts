import { NextResponse } from "next/server";
import { resend, EMAIL_FROM } from "@/lib/email";

export const runtime = "nodejs"; // ensure Node runtime, not edge

export async function POST() {
  const to = process.env.TEST_RECEIPT_TO;
  if (!to) {
    return NextResponse.json(
      { error: "Set TEST_RECEIPT_TO in .env" },
      { status: 400 }
    );
  }

  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: "Bitgill test email",
    html: "<p>If you got this, Resend is wired up ✅</p>",
  });

  if (error) {
    console.error("RESEND ERROR:", error);
    return NextResponse.json({ error }, { status: 500 });
  }

  console.log("RESEND SENT:", data);
  return NextResponse.json({ data });
}
