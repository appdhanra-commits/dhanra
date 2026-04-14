const STORAGE = {
  session: "dhanra_session_v1",
  legacySession: "dhanra_session_v1",
};

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function todayISODate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizePhone(input) {
  const digits = String(input ?? "").replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.length === 10) return digits;
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

function normalizeAmount(input) {
  const n = Number(input);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

function normalizeIFSC(input) {
  return String(input ?? "").trim().toUpperCase();
}

function normalizeText(input) {
  return String(input ?? "").trim();
}

export function apiBase() {
  // Use environment variable if available, otherwise fallback
  return import.meta.env?.VITE_API_BASE_URL || "https://dhanra-backend.onrender.com";
}

const API = `${apiBase()}/api/customers`;

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  const data = safeJsonParse(text, null);

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data && String(data.error)) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

function getSession() {
  const next = localStorage.getItem(STORAGE.session);
  if (next) return safeJsonParse(next, null);

  const legacy = localStorage.getItem(STORAGE.legacySession);
  if (!legacy) return null;

  const parsed = safeJsonParse(legacy, null);
  if (parsed) {
    localStorage.setItem(STORAGE.session, legacy);
    localStorage.removeItem(STORAGE.legacySession);
  }
  return parsed;
}

function setSession(session) {
  localStorage.setItem(STORAGE.session, JSON.stringify(session));
  localStorage.removeItem(STORAGE.legacySession);
}

function clearSession() {
  localStorage.removeItem(STORAGE.session);
  localStorage.removeItem(STORAGE.legacySession);
}

function isOverdue(dueDate, paidAt) {
  if (paidAt) return false;
  const due = new Date(`${dueDate}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return due < today;
}

export function getCustomerStatus(customer) {
  if (customer.paidAt) return "paid";
  if (isOverdue(customer.dueDate, customer.paidAt)) return "overdue";
  return "unpaid";
}

function fromApiCustomer(c) {
  return {
    id: String(c?._id ?? c?.id ?? ""),
    name: normalizeText(c?.name),
    phone: normalizePhone(c?.phone),
    amount: normalizeAmount(c?.amount),
    dueDate: String(c?.dueDate ?? todayISODate()),
    paidAt: c?.paidAt ? String(c.paidAt) : c?.lastPaymentDate ? String(c.lastPaymentDate) : null,
  };
}

export async function getCustomers() {
  const data = await apiFetch("", { method: "GET" });
  const list = Array.isArray(data) ? data : [];
  return list
    .map(fromApiCustomer)
    .sort((a, b) => {
      const aPaid = a.paidAt ? 1 : 0;
      const bPaid = b.paidAt ? 1 : 0;
      if (aPaid !== bPaid) return aPaid - bPaid;
      return new Date(`${a.dueDate}T00:00:00`) - new Date(`${b.dueDate}T00:00:00`);
    });
}

export async function addCustomer(input) {
  const payload = {
    name: normalizeText(input?.name),
    phone: normalizePhone(input?.phone),
    amount: normalizeAmount(input?.amount),
    dueDate: String(input?.dueDate ?? todayISODate()),
  };
  const created = await apiFetch("", { method: "POST", body: JSON.stringify(payload) });
  return fromApiCustomer(created);
}

export async function updateCustomer(id, patch) {
  const payload = {
    name: normalizeText(patch?.name),
    phone: normalizePhone(patch?.phone),
    amount: normalizeAmount(patch?.amount),
    dueDate: String(patch?.dueDate ?? todayISODate()),
  };
  const updated = await apiFetch(`/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return fromApiCustomer(updated);
}

export async function deleteCustomer(id) {
  await apiFetch(`/${encodeURIComponent(id)}`, { method: "DELETE" });
  return true;
}

export async function markCustomerPaid(id) {
  const updated = await apiFetch(`/${encodeURIComponent(id)}/pay`, { method: "PUT" });
  return fromApiCustomer(updated);
}

// Optional (kept for your existing UI toggle). Backend can add an "unpay" later.
export async function setCustomerUnpaid(_id) {
  throw new Error("Mark unpaid is not supported yet by backend.");
}

export function verifyLicense(input) {
  const businessName = normalizeText(input?.businessName);
  const bankAccount = String(input?.bankAccount ?? "").replace(/\s+/g, "");
  const ifsc = normalizeIFSC(input?.ifsc);
  const licenseKey = normalizeText(input?.licenseKey).toUpperCase();

  if (!businessName) return { ok: false, message: "Business name is required." };
  if (!/^\d{9,18}$/.test(bankAccount)) {
    return { ok: false, message: "Enter a valid bank account number (9–18 digits)." };
  }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    return { ok: false, message: "Enter a valid IFSC (e.g., HDFC0001234)." };
  }
  if (!licenseKey) return { ok: false, message: "License key is required." };

  const looksValid =
    licenseKey.startsWith("DHANRA-") ||
    licenseKey === "DEMO" ||
    licenseKey.replace(/-/g, "").length >= 12;

  if (!looksValid) {
    return { ok: false, message: "License key not recognized. Try demo access." };
  }

  const session = {
    businessName,
    bankAccountMasked: bankAccount.slice(-4).padStart(bankAccount.length, "•"),
    ifsc,
    licenseKeyMasked: licenseKey.length > 8 ? `${licenseKey.slice(0, 4)}…${licenseKey.slice(-4)}` : "••••",
    verifiedAt: new Date().toISOString(),
  };
  setSession(session);
  return { ok: true, message: "License verified. Redirecting…", session };
}

export function logout() {
  clearSession();
}

export function getActiveSession() {
  return getSession();
}

