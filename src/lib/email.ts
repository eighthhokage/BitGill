import { Resend } from "resend";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export const resend = new Resend(requireEnv("RESEND_API_KEY"));
export const EMAIL_FROM = requireEnv("EMAIL_FROM");
