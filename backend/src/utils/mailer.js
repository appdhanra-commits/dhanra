import nodemailer from "nodemailer";

function hasSmtpEnv() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function getTransport() {
  if (!hasSmtpEnv()) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendLicenseEmail({ to, businessName, contactName, licenseKey }) {
  const transport = getTransport();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@dhanra.local";

  const subject = `Your Dhanra license key`;
  const text = [
    `Hi ${contactName},`,
    ``,
    `Your business "${businessName}" has been verified.`,
    `Here is your Dhanra license key:`,
    ``,
    `${licenseKey}`,
    ``,
    `Login at: ${process.env.APP_URL || "http://localhost:5000/"}`,
    ``,
    `— Dhanra`,
  ].join("\n");

  if (!transport) {
    // eslint-disable-next-line no-console
    console.log("[MAILER DEV] Would send to:", to);
    // eslint-disable-next-line no-console
    console.log(text);
    return { ok: true, mode: "dev-log" };
  }

  await transport.verify();
  await transport.sendMail({ from, to, subject, text });
  return { ok: true, mode: "smtp" };
}

