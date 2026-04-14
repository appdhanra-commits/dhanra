import express from "express";
import { getTransport } from "../utils/mailer.js";

const router = express.Router();

function requireAdmin(req, res, next) {
  const key = String(req.header("x-admin-key") || "").trim();
  const expected = String(process.env.ADMIN_KEY || "").trim();
  if (!expected) return res.status(500).json({ error: "ADMIN_KEY not configured." });
  if (!key || key !== expected) return res.status(401).json({ error: "Unauthorized." });
  next();
}

router.get("/smtp/status", requireAdmin, async (_req, res) => {
  const transport = getTransport();
  if (!transport) return res.json({ ok: true, configured: false });
  try {
    await transport.verify();
    return res.json({ ok: true, configured: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "SMTP verify failed.";
    return res.json({ ok: true, configured: true, verifyOk: false, error: msg });
  }
});

export default router;

