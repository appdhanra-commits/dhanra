import express from "express";
import BusinessApplication from "../models/BusinessApplication.js";
import License from "../models/License.js";
import { generateLicenseKey, maskBankAccount } from "../utils/license.js";
import { sendLicenseEmail } from "../utils/mailer.js";

const router = express.Router();

function requireAdmin(req, res, next) {
  const key = String(req.header("x-admin-key") || "").trim();
  const expected = String(process.env.ADMIN_KEY || "").trim();
  if (!expected) return res.status(500).json({ error: "ADMIN_KEY not configured." });
  if (!key || key !== expected) return res.status(401).json({ error: "Unauthorized." });
  next();
}

function sanitizePhone(phone) {
  const digits = String(phone ?? "").replace(/\D+/g, "");
  if (digits.length === 10) return digits;
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

function sanitizeApplicationInput(body) {
  const businessName = String(body?.businessName ?? "").trim();
  const contactName = String(body?.contactName ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const phone = sanitizePhone(body?.phone);
  const address = String(body?.address ?? "").trim();
  const bankAccount = String(body?.bankAccount ?? "").replace(/\s+/g, "");
  const ifsc = String(body?.ifsc ?? "").trim().toUpperCase();

  if (!businessName) return { ok: false, message: "Business name is required." };
  if (!contactName) return { ok: false, message: "Contact person name is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Valid email is required." };
  if (phone.length < 10) return { ok: false, message: "Phone must be a valid 10-digit number." };
  if (!address) return { ok: false, message: "Business address is required." };
  if (!/^\d{9,18}$/.test(bankAccount)) {
    return { ok: false, message: "Enter a valid bank account number (9–18 digits)." };
  }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    return { ok: false, message: "Enter a valid IFSC (e.g., HDFC0001234)." };
  }

  const { masked } = maskBankAccount(bankAccount);
  return {
    ok: true,
    value: {
      businessName,
      contactName,
      email,
      phone,
      address,
      bankAccountMasked: masked,
      ifsc,
    },
  };
}

// POST /api/license/request
router.post("/request", async (req, res) => {
  const parsed = sanitizeApplicationInput(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.message });

  const existingPending = await BusinessApplication.findOne({
    email: parsed.value.email,
    status: "pending",
  }).lean();

  if (existingPending) {
    return res.json({
      ok: true,
      status: "pending",
      message: "Request already submitted. We will email your license key after verification.",
    });
  }

  await BusinessApplication.create(parsed.value);
  return res.status(201).json({
    ok: true,
    status: "pending",
    message: "Request submitted. We will email your license key after verification.",
  });
});

// POST /api/license/verify
router.post("/verify", async (req, res) => {
  const licenseKey = String(req.body?.licenseKey ?? "").trim().toUpperCase();
  if (!licenseKey) return res.status(400).json({ error: "License key is required." });

  const license = await License.findOne({ key: licenseKey, active: true }).lean();
  if (!license) return res.status(401).json({ error: "Invalid license key." });

  return res.json({
    ok: true,
    session: {
      licenseKey: license.key,
      businessName: license.businessName,
      ifsc: license.ifsc,
      bankAccountMasked: license.bankAccountMasked,
      verifiedAt: new Date().toISOString(),
    },
  });
});

// GET /api/license/admin/applications
router.get("/admin/applications", requireAdmin, async (_req, res) => {
  const apps = await BusinessApplication.find({})
    .sort({ createdAt: -1 })
    .populate("licenseId")
    .lean();
  res.json(
    apps.map((a) => ({
      _id: String(a._id),
      businessName: a.businessName,
      contactName: a.contactName,
      email: a.email,
      phone: a.phone,
      address: a.address,
      bankAccountMasked: a.bankAccountMasked,
      ifsc: a.ifsc,
      status: a.status,
      notes: a.notes || "",
      licenseKey: a.licenseId?.key || null,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }))
  );
});

// POST /api/license/admin/applications/:id/approve
router.post("/admin/applications/:id/approve", requireAdmin, async (req, res) => {
  const app = await BusinessApplication.findById(req.params.id);
  if (!app) return res.status(404).json({ error: "Application not found." });
  if (app.status === "approved" && app.licenseId) {
    const existing = await License.findById(app.licenseId).lean();
    return res.json({ ok: true, licenseKey: existing?.key || null, message: "Already approved." });
  }

  const licenseKey = generateLicenseKey();
  const license = await License.create({
    key: licenseKey,
    businessName: app.businessName,
    contactName: app.contactName,
    email: app.email,
    phone: app.phone,
    bankAccountMasked: app.bankAccountMasked,
    ifsc: app.ifsc,
    active: true,
  });

  app.status = "approved";
  app.licenseId = license._id;
  app.notes = String(req.body?.notes ?? "").trim();
  await app.save();

  const emailResult = await sendLicenseEmail({
    to: app.email,
    businessName: app.businessName,
    contactName: app.contactName,
    licenseKey,
  });

  return res.json({
    ok: true,
    licenseKey,
    email: { ok: true, mode: emailResult.mode },
    message: "Approved and license issued.",
  });
});

// POST /api/license/admin/applications/:id/reject
router.post("/admin/applications/:id/reject", requireAdmin, async (req, res) => {
  const app = await BusinessApplication.findById(req.params.id);
  if (!app) return res.status(404).json({ error: "Application not found." });
  app.status = "rejected";
  app.notes = String(req.body?.notes ?? "").trim();
  await app.save();
  res.json({ ok: true });
});

export default router;

