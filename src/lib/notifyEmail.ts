// src/lib/notifyEmail.ts

export function isValidEmailBasic(email: string): boolean {
  // Practical, not perfect. Avoids most junk inputs.
  // - no spaces
  // - single @
  // - local part 1..64 chars
  // - domain has at least one dot, labels 1..63, no leading/trailing hyphen
  if (!email) return false;
  if (email.length > 254) return false;
  if (/\s/.test(email)) return false;

  const at = email.indexOf("@");
  if (at <= 0) return false;
  if (email.indexOf("@", at + 1) !== -1) return false;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (local.length < 1 || local.length > 64) return false;
  if (domain.length < 3 || domain.length > 253) return false;

  // local: allow common characters (won't accept every RFC-valid case, on purpose)
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return false;
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (local.includes("..")) return false;

  // domain must contain a dot and only valid chars
  if (!/^[a-z0-9.-]+$/i.test(domain)) return false;
  if (!domain.includes(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  if (domain.includes("..")) return false;

  const labels = domain.split(".");
  if (labels.some((l) => l.length < 1 || l.length > 63)) return false;
  if (labels.some((l) => l.startsWith("-") || l.endsWith("-"))) return false;

  // TLD should be letters, length 2..24 (keeps it sane)
  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,24}$/i.test(tld)) return false;

  return true;
}

export function parseNotifyEmails(raw: unknown, max = 2): { ok: true; emails: string[] } | { ok: false; error: string } {
  if (raw === null || raw === undefined) return { ok: true, emails: [] };

  const input = String(raw).trim();
  if (!input) return { ok: true, emails: [] };

  // Accept comma OR whitespace separated
  const parts = input
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length > max) {
    return { ok: false, error: `notifyEmail supports at most ${max} email address${max === 1 ? "" : "es"}` };
  }

  for (const e of parts) {
    if (!isValidEmailBasic(e)) {
      return { ok: false, error: "One of the receipt emails looks invalid" };
    }
  }

  // Dedup case-insensitive while preserving first-seen casing
  const deduped = Array.from(new Map(parts.map((e) => [e.toLowerCase(), e])).values());

  if (deduped.length > max) {
    return { ok: false, error: `notifyEmail supports at most ${max} email address${max === 1 ? "" : "es"}` };
  }

  return { ok: true, emails: deduped };
}

// Stored format helper: you can keep notifyEmail as a single string in DB
export function emailsToStoredValue(emails: string[]): string | null {
  if (!emails.length) return null;
  return emails.join(",");
}
