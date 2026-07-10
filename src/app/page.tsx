import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "BitGill | Bitcoin Invoice Generator",
  description:
    "Create a Bitcoin invoice and share a Bitcoin payment request with BitGill, a simple non-custodial Bitcoin invoice generator.",
  keywords: [
    "Bitcoin invoice",
    "Bitcoin invoice generator",
    "create Bitcoin invoice",
    "Bitcoin payment request",
    "Bitcoin payment link",
    "non-custodial Bitcoin payments",
    "on-chain Bitcoin invoice",
    "Bitcoin invoice for freelancers",
    "Bitcoin invoice for small business",
  ],
  openGraph: {
    title: "BitGill Bitcoin Invoice Generator",
    description:
      "Create shareable on-chain Bitcoin payment requests. BitGill is non-custodial and never holds funds.",
    type: "website",
  },
};

const faqItems = [
  {
    question: "What is a Bitcoin invoice?",
    answer:
      "A Bitcoin invoice is a payment request that tells someone which Bitcoin address to pay, how much to send, and what the payment is for.",
  },
  {
    question: "Is BitGill a wallet or payment processor?",
    answer:
      "No. BitGill is not a wallet, exchange, bank, escrow service, or payment processor. It creates shareable Bitcoin payment requests.",
  },
  {
    question: "Where do payments go?",
    answer:
      "Payments go directly to the Bitcoin address entered by the invoice creator. BitGill does not custody funds.",
  },
  {
    question: "Does BitGill need my seed phrase or private key?",
    answer:
      "No. BitGill never asks for seed phrases, private keys, wallet backups, or exchange passwords.",
  },
  {
    question: "Who is BitGill for?",
    answer:
      "BitGill can be used as a Bitcoin invoice generator for freelancers, small businesses, and anyone who wants a simple on-chain Bitcoin invoice.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="border-b px-6 py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-5xl gap-10 md:grid-cols-[1.15fr_0.85fr] md:items-center">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Image src="/logo-small.png" alt="BitGill logo" width={56} height={56} priority />
              <span className="text-lg font-semibold">BitGill</span>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium uppercase text-gray-500">
                Bitcoin invoice generator
              </p>
              <h1 className="text-4xl font-semibold tracking-normal text-gray-950 sm:text-5xl">
                Create a Bitcoin invoice people can pay directly on-chain.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-gray-600">
                BitGill is a simple Bitcoin invoice generator for creating shareable Bitcoin
                payment requests. Make a Bitcoin payment link with an address, amount, memo, and
                confirmation target without turning BitGill into a custodian.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/create"
                className="inline-flex items-center justify-center rounded-lg border border-gray-950 bg-gray-950 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
              >
                Create Bitcoin invoice
              </Link>
              <a
                href="#safety"
                className="inline-flex items-center justify-center rounded-lg border px-5 py-3 text-sm font-medium hover:bg-gray-50"
              >
                Review safety notes
              </a>
            </div>
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500">Payment request</div>
                <div className="mt-1 text-2xl font-semibold">25,000 sats</div>
              </div>
              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="text-xs font-medium uppercase text-gray-500">
                  Pay to
                </div>
                <div className="mt-2 break-all font-mono text-sm text-gray-800">
                  bc1q...invoice-address
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <div className="text-gray-500">Status</div>
                  <div className="font-medium">Waiting</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-gray-500">Custody</div>
                  <div className="font-medium">Never held</div>
                </div>
              </div>
              <p className="text-sm leading-6 text-gray-600">
                A Bitcoin invoice is a clear request to send a specific amount to a specific
                address. BitGill helps format and share that request.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="safety" className="border-b bg-gray-50 px-6 py-12">
        <div className="mx-auto w-full max-w-5xl">
          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-2xl font-semibold">Trust and safety first</h2>
            <div className="mt-4 grid gap-4 text-sm leading-6 text-gray-700 md:grid-cols-3">
              <p>
                BitGill is non-custodial. Payments go directly to the Bitcoin address entered by
                the invoice creator.
              </p>
              <p>
                BitGill is not a wallet, exchange, bank, escrow service, or payment processor.
              </p>
              <p>
                BitGill never asks for seed phrases, private keys, wallet backups, or exchange
                passwords.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b px-6 py-14">
        <div className="mx-auto grid w-full max-w-5xl gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold">How it works</h2>
            <div className="mt-6 space-y-4">
              {[
                "Enter the Bitcoin address that should receive the payment.",
                "Add the amount in sats, an optional memo, and a confirmation target.",
                "Share the Bitcoin payment request link with the person paying the invoice.",
                "The payer sends funds directly to the address you provided.",
              ].map((item, index) => (
                <div key={item} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-medium">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-sm leading-6 text-gray-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold">Why use BitGill?</h2>
            <div className="mt-6 space-y-4 text-sm leading-6 text-gray-700">
              <p>
                BitGill keeps Bitcoin invoicing simple. It is useful when you want an on-chain
                Bitcoin invoice without a heavy checkout system.
              </p>
              <p>
                Use it to create Bitcoin invoice links for freelancers, small business payments,
                direct services, reimbursements, or straightforward one-off payment requests.
              </p>
              <p>
                The payment request is easy to share, while the actual payment remains a direct
                non-custodial Bitcoin payment to the address you choose.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-14">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">FAQ</h2>
              <p className="mt-2 text-sm text-gray-600">
                Clear answers before you create a Bitcoin payment link.
              </p>
            </div>
            <Link
              href="/create"
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Create invoice
            </Link>
          </div>

          <div className="divide-y">
            {faqItems.map((item) => (
              <div key={item.question} className="py-5">
                <h3 className="font-medium">{item.question}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-700">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
