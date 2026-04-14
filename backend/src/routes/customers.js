import express from "express";
import Customer from "../models/Customer.js";
import License from "../models/License.js";

const router = express.Router();

async function requireLicense(req, res, next) {
  const key = String(req.header("x-license-key") || "").trim().toUpperCase();
  if (!key) return res.status(401).json({ error: "Missing license key." });
  const license = await License.findOne({ key, active: true }).lean();
  if (!license) return res.status(401).json({ error: "Invalid or inactive license key." });
  req.license = license;
  next();
}

function toISODate(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function computeStatus({ dueDate, paidAt }) {
  if (paidAt) return "paid";
  const due = new Date(`${dueDate}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return due < today ? "overdue" : "unpaid";
}

function sanitizePhone(phone) {
  const digits = String(phone ?? "").replace(/\D+/g, "");
  if (digits.length === 10) return digits;
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

function sanitizeCustomerInput(body) {
  const name = String(body?.name ?? "").trim();
  const phone = sanitizePhone(body?.phone);
  const amount = Number(body?.amount);
  const dueDate = String(body?.dueDate ?? "").trim();

  if (!name) return { ok: false, message: "Name is required." };
  if (phone.length < 10) return { ok: false, message: "Phone must be a valid 10-digit number." };
  if (!Number.isFinite(amount) || amount < 0) return { ok: false, message: "Amount must be a valid number." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { ok: false, message: "Due date must be YYYY-MM-DD." };

  return { ok: true, value: { name, phone, amount: Math.round(amount), dueDate } };
}

function apiShape(doc) {
  const c = doc.toObject ? doc.toObject() : doc;
  return {
    _id: String(c._id),
    name: c.name,
    phone: c.phone,
    amount: c.amount,
    dueDate: c.dueDate,
    status: computeStatus(c),
    lastPaymentDate: c.paidAt || null,
    paidAt: c.paidAt || null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

// POST /api/customers
router.post("/", requireLicense, async (req, res) => {
  const parsed = sanitizeCustomerInput(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.message });

  const created = await Customer.create({
    licenseId: req.license._id,
    ...parsed.value,
    paidAt: null,
  });
  return res.status(201).json(apiShape(created));
});

// GET /api/customers
router.get("/", requireLicense, async (req, res) => {
  const docs = await Customer.find({ licenseId: req.license._id }).sort({ createdAt: -1 }).lean();
  res.json(docs.map(apiShape));
});

// PUT /api/customers/:id/pay
router.put("/:id/pay", requireLicense, async (req, res) => {
  const updated = await Customer.findByIdAndUpdate(
    req.params.id,
    { paidAt: toISODate(new Date()) },
    { new: true }
  );
  if (!updated || String(updated.licenseId) !== String(req.license._id)) {
    return res.status(404).json({ error: "Customer not found." });
  }
  res.json(apiShape(updated));
});

// PUT /api/customers/:id (edit)
router.put("/:id", requireLicense, async (req, res) => {
  const parsed = sanitizeCustomerInput(req.body);
  if (!parsed.ok) return res.status(400).json({ error: parsed.message });

  const existing = await Customer.findById(req.params.id);
  if (!existing || String(existing.licenseId) !== String(req.license._id)) {
    return res.status(404).json({ error: "Customer not found." });
  }

  const updated = await Customer.findByIdAndUpdate(req.params.id, parsed.value, { new: true });
  res.json(apiShape(updated));
});

// DELETE /api/customers/:id
router.delete("/:id", requireLicense, async (req, res) => {
  const existing = await Customer.findById(req.params.id);
  if (!existing || String(existing.licenseId) !== String(req.license._id)) {
    return res.status(404).json({ error: "Customer not found." });
  }

  await Customer.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

export default router;

