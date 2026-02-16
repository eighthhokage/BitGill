Bitgill is a free Bitcoin invoice generator by HarvestBTC ^^ 
You can use it to generate an invoice for payment and tracking and I hope it will foster more bitcoin transactions!
:) :) :) 
Stack sats, stay humble, and praise God! 
If you want to donate you can send to bc1qfjdzkht7srmqd0y296pqw3zkwsfkxjl9h5ah35

---

## What Bitgill does

- Creates a simple on-chain Bitcoin invoice (BIP21) with:
  - receiving address
  - amount (sats)
  - optional memo
  - optional email receipt (supports **up to 2 recipients**, comma-separated)
  - confirmation target (1–3)
- Shows an estimated USD value (informational only).
- Tracks invoice status by checking for a matching payment and confirmations.
- Sends a receipt email (once) when the invoice is finalized.

### Notes / limitations (MVP)
- **Use a fresh Bitcoin address per invoice** for best reliability and privacy.
- **USD estimate is informational** and may be inaccurate.
- **BitGill does not custody funds** (funds go directly to the provided address).

---

## Tech stack

- Next.js (App Router)
- Prisma + Postgres (Neon)
- Resend (email receipts)
- Esplora API (mempool.space by default) for on-chain status
- Vercel hosting (recommended)
- Cloudflare DNS + rate limiting (recommended)

---

## Local development

### 1) Install dependencies
```bash
npm install


2) Configure environment variables
Deployment (Vercel + Neon + Cloudflare)
1) Neon (Postgres)

Create a Neon project + database.

Copy your DATABASE_URL into Vercel environment variables.

2) Vercel

Import the GitHub repo into Vercel.

Add the following environment variables in Vercel → Project → Settings → Environment Variables:

DATABASE_URL

RESEND_API_KEY

EMAIL_FROM

(optional) ESPLORA_BASE_URL

Vercel will build and run prisma migrate deploy during deploy if you’ve set up a build script to do so.

3) Add custom domain

Add bitgill.com (and optionally www.bitgill.com) in Vercel → Domains.

In Cloudflare DNS, point the domain to Vercel using the records Vercel tells you to set.

Many setups use:

A record for apex (bitgill.com) → Vercel IP

CNAME for www → cname.vercel-dns.com

Keep Cloudflare “Proxy status” DNS only (gray cloud) until Vercel verifies the domain.

After verification, you can turn proxying on if you want Cloudflare features in front.

4) Cloudflare rate limiting (recommended)

Create a rate limiting rule for invoice creation to reduce abuse.

Suggested target:

POST requests to /api/invoices

Example (tweak for your traffic):

60 requests per minute per IP (or equivalent)

Contributing

PRs welcome. If you’re changing invoice semantics, API routes, or email receipt behavior, please keep the UX simple and spam-resistant.
