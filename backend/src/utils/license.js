import crypto from "crypto";

export function maskBankAccount(raw) {
  const digits = String(raw ?? "").replace(/\s+/g, "");
  const last4 = digits.slice(-4);
  const masked = last4.padStart(digits.length || 12, "•");
  return { masked, last4 };
}

export function generateLicenseKey() {
  const buf = crypto.randomBytes(8).toString("hex").toUpperCase(); // 16 chars
  const a = buf.slice(0, 4);
  const b = buf.slice(4, 8);
  const c = buf.slice(8, 12);
  const d = buf.slice(12, 16);
  return `DHANRA-${a}-${b}-${c}-${d}`;
}

