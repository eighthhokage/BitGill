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
