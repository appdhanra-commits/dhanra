// Combined JavaScript file for Dhanra application
// All modules combined to avoid ES6 import issues

// Storage utilities
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

function apiBase() {
  if (location.protocol === "file:") return "http://localhost:5000";
  return "";
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

function getCustomerStatus(customer) {
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

async function getCustomers() {
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

async function addCustomer(input) {
  const payload = {
    name: normalizeText(input?.name),
    phone: normalizePhone(input?.phone),
    amount: normalizeAmount(input?.amount),
    dueDate: String(input?.dueDate ?? todayISODate()),
  };
  const created = await apiFetch("", { method: "POST", body: JSON.stringify(payload) });
  return fromApiCustomer(created);
}

async function updateCustomer(id, patch) {
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

async function deleteCustomer(id) {
  await apiFetch(`/${encodeURIComponent(id)}`, { method: "DELETE" });
  return true;
}

async function markCustomerPaid(id) {
  const updated = await apiFetch(`/${encodeURIComponent(id)}/pay`, { method: "PUT" });
  return fromApiCustomer(updated);
}

async function setCustomerUnpaid(_id) {
  throw new Error("Mark unpaid is not supported yet by backend.");
}

function verifyLicense(input) {
  const businessName = normalizeText(input?.businessName);
  const bankAccount = String(input?.bankAccount ?? "").replace(/\s+/g, "");
  const ifsc = normalizeIFSC(input?.ifsc);
  const licenseKey = normalizeText(input?.licenseKey).toUpperCase();

  if (!businessName) return { ok: false, message: "Business name is required." };
  if (!/^\d{9,18}$/.test(bankAccount)) {
    return { ok: false, message: "Enter a valid bank account number (9-18 digits)." };
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
    bankAccountMasked: bankAccount.slice(-4).padStart(bankAccount.length, ""),
    ifsc,
    licenseKeyMasked: licenseKey.length > 8 ? `${licenseKey.slice(0, 4)}${licenseKey.slice(-4)}` : "",
    verifiedAt: new Date().toISOString(),
  };
  setSession(session);
  return { ok: true, message: "License verified. Redirecting", session };
}

function logout() {
  clearSession();
}

function getActiveSession() {
  return getSession();
}

// UI functions
function el(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element: #${id}`);
  return node;
}

function isValidDateISO(d) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(d || ""));
}

function currentTableState() {
  return {
    query: el("search").value || "",
    statusFilter: el("filter-status").value || "all",
  };
}

function setAppNotice(notice) {
  const node = el("app-notice");
  if (!notice.message) {
    node.hidden = true;
    return;
  }
  node.textContent = notice.message;
  node.className = `notice app-notice is-${notice.tone}`;
  node.hidden = false;
}

function setAuthNotice(notice) {
  const node = el("auth-notice");
  if (!notice.message) {
    node.hidden = true;
    return;
  }
  node.textContent = notice.message;
  node.className = `notice is-${notice.tone}`;
  node.hidden = false;
}

function setCustomerFormNotice(notice) {
  const node = el("customer-form-notice");
  if (!notice.message) {
    node.hidden = true;
    return;
  }
  node.textContent = notice.message;
  node.className = `notice is-${notice.tone}`;
  node.hidden = false;
}

function setUserPill(session) {
  el("user-business").textContent = session.businessName;
  el("user-sub").textContent = "License verified";
}

function setView(view) {
  document.querySelectorAll('[id^="view-"]').forEach((node) => {
    node.setAttribute("aria-hidden", "true");
  });
  const target = document.getElementById(`view-${view}`);
  if (target) target.setAttribute("aria-hidden", "false");
}

function updateStats(customers) {
  const total = customers.length;
  const unpaid = customers.filter((c) => getCustomerStatus(c) === "unpaid").length;
  const overdue = customers.filter((c) => getCustomerStatus(c) === "overdue").length;
  const paid = customers.filter((c) => getCustomerStatus(c) === "paid").length;

  el("stat-customers").textContent = total;
  el("stat-unpaid").textContent = unpaid;
  el("stat-overdue").textContent = overdue;
  el("stat-paid").textContent = paid;
}

function statusPill(status) {
  const pill = document.createElement("span");
  pill.className = `pill is-${status}`;
  pill.textContent = status.charAt(0).toUpperCase() + status.slice(1);
  return pill;
}

function renderCustomersTable(customers, state) {
  const tbody = el("customers-tbody");
  const empty = el("customers-empty");
  tbody.innerHTML = "";

  let filtered = customers;
  if (state.query) {
    const q = state.query.toLowerCase();
    filtered = filtered.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }
  if (state.statusFilter !== "all") {
    filtered = filtered.filter((c) => getCustomerStatus(c) === state.statusFilter);
  }

  if (filtered.length === 0) {
    tbody.hidden = true;
    empty.hidden = false;
    return;
  }

  tbody.hidden = false;
  empty.hidden = true;

  filtered.forEach((customer) => {
    const tr = document.createElement("tr");
    tr.setAttribute("data-customer-id", customer.id);
    tr.innerHTML = `
      <td>${customer.name}</td>
      <td>${customer.phone}</td>
      <td class="mono">Rs${customer.amount.toLocaleString("en-IN")}</td>
      <td>${customer.dueDate}</td>
      <td>${statusPill(getCustomerStatus(customer)).outerHTML}</td>
      <td class="actions">
        <button class="btn btn-sm btn-ghost" data-action="edit">Edit</button>
        <button class="btn btn-sm btn-ghost" data-action="delete">Delete</button>
        ${getCustomerStatus(customer) === "unpaid" ? `<button class="btn btn-sm btn-primary" data-action="mark-paid">Mark Paid</button>` : ""}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openCustomerModal({ mode, customer }) {
  const modal = el("modal-customer");
  const title = el("modal-title");
  const form = el("customer-form");
  const notice = el("customer-form-notice");

  title.textContent = mode === "add" ? "Add customer" : "Edit customer";
  form.reset();
  setCustomerFormNotice({ message: "", tone: "" });

  if (mode === "edit") {
    el("customerId").value = customer.id;
    el("customerName").value = customer.name;
    el("customerPhone").value = customer.phone;
    el("customerAmount").value = customer.amount;
    el("customerDueDate").value = customer.dueDate;
  } else {
    el("customerId").value = "";
    el("customerDueDate").value = new Date().toISOString().slice(0, 10);
  }

  modal.setAttribute("aria-hidden", "false");
}

function closeCustomerModal() {
  el("modal-customer").setAttribute("aria-hidden", "true");
}

function openConfirmDeleteModal({ customer }) {
  const modal = el("modal-confirm");
  const title = el("confirm-title");
  const body = el("confirm-body");

  title.textContent = `Delete ${customer.name}?`;
  body.innerHTML = `
    <div><strong>Name:</strong> ${customer.name}</div>
    <div><strong>Phone:</strong> ${customer.phone}</div>
    <div><strong>Amount:</strong> Rs${customer.amount.toLocaleString("en-IN")}</div>
  `;

  modal.setAttribute("aria-hidden", "false");
}

function closeConfirmDeleteModal() {
  el("modal-confirm").setAttribute("aria-hidden", "true");
}

function wireModalDismissHandlers({ onCloseCustomer, onCloseConfirm }) {
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest("[data-close='customer']")) {
      onCloseCustomer();
    }
    if (target.closest("[data-close='confirm']")) {
      onCloseConfirm();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!el("modal-customer").getAttribute("aria-hidden") || el("modal-customer").getAttribute("aria-hidden") === "false") {
        onCloseCustomer();
      }
      if (!el("modal-confirm").getAttribute("aria-hidden") || el("modal-confirm").getAttribute("aria-hidden") === "false") {
        onCloseConfirm();
      }
    }
  });
}

// Main application logic
async function refresh() {
  try {
    setAppNotice({ message: "", tone: "" });
    const customers = await getCustomers();
    updateStats(customers);
    renderCustomersTable(customers, currentTableState());
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : "Unable to load customers. Is the backend running?";
    setAppNotice({
      message: `Data load failed: ${msg}. If you're running locally, open http://localhost:5000/ and ensure MongoDB is running.`,
      tone: "danger",
    });
  }
}

function setActiveNav(key) {
  document.querySelectorAll("[data-nav]").forEach((n) => {
    if (!(n instanceof HTMLElement)) return;
    if (!n.classList.contains("navlink")) return;
    n.classList.toggle("is-active", n.getAttribute("data-nav") === key);
  });
}

function route() {
  const session = getActiveSession();
  if (!session) {
    setView("auth");
    return;
  }
  setView("dashboard");
  setUserPill(session);
  setActiveNav("dashboard");
  refresh().catch(() => {});
}

let pendingDeleteId = null;

function getCustomerById(id) {
  return getCustomers().then((list) => list.find((c) => c.id === id) || null);
}

function openAdd() {
  openCustomerModal({ mode: "add", customer: { dueDate: new Date().toISOString().slice(0, 10) } });
}

async function openEdit(id) {
  const customer = await getCustomerById(id);
  if (!customer) return;
  openCustomerModal({ mode: "edit", customer });
}

async function openDelete(id) {
  const customer = await getCustomerById(id);
  if (!customer) return;
  pendingDeleteId = id;
  openConfirmDeleteModal({ customer });
}

async function onRowAction(target) {
  const btn = target.closest("button[data-action]");
  if (!btn) return;
  const tr = btn.closest("tr[data-customer-id]");
  const id = tr?.getAttribute("data-customer-id");
  if (!id) return;

  const action = btn.getAttribute("data-action");
  if (action === "edit") return openEdit(id);
  if (action === "delete") return openDelete(id);
  if (action === "mark-paid") {
    try {
      await markCustomerPaid(id);
      await refresh();
    } catch {}
    return;
  }
}

function initAuth() {
  const form = el("license-form");
  const demo = el("btn-demo");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setAuthNotice({ message: "", tone: "" });

    const fd = new FormData(form);
    const payload = {
      businessName: fd.get("businessName"),
      bankAccount: fd.get("bankAccount"),
      ifsc: fd.get("ifsc"),
      licenseKey: fd.get("licenseKey"),
    };

    el("btn-submit-access").setAttribute("disabled", "true");
    el("btn-submit-access").textContent = "Verifying";

    await new Promise((r) => setTimeout(r, 550));
    const result = verifyLicense(payload);

    el("btn-submit-access").removeAttribute("disabled");
    el("btn-submit-access").textContent = "Submit request";

    if (!result.ok) {
      setAuthNotice({ message: result.message, tone: "danger" });
      return;
    }

    setAuthNotice({ message: result.message, tone: "success" });
    setTimeout(() => route(), 350);
  });

  demo.addEventListener("click", () => {
    const result = verifyLicense({
      businessName: "Dhanra Demo",
      bankAccount: "12345678901",
      ifsc: "HDFC0001234",
      licenseKey: "DEMO",
    });
    setAuthNotice({ message: result.message, tone: "success" });
    setTimeout(() => route(), 250);
  });
}

function initDashboard() {
  el("btn-logout").addEventListener("click", () => {
    logout();
    pendingDeleteId = null;
    setAuthNotice({ message: "", tone: "" });
    route();
  });

  el("btn-add-customer").addEventListener("click", () => openAdd());

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const addFromEmpty = t.closest("[data-action='add-from-empty']");
    if (addFromEmpty) openAdd();
  });

  el("search").addEventListener("input", () => refresh());
  el("filter-status").addEventListener("change", () => refresh());

  el("customers-tbody").addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    onRowAction(t).catch(() => {});
  });

  document.querySelectorAll("[data-nav]").forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    node.addEventListener("click", () => {
      const key = node.getAttribute("data-nav") || "dashboard";
      setActiveNav(key);
      if (key === "customers") {
        document.querySelector(".page-title")?.replaceChildren(document.createTextNode("Customers"));
        document.querySelector(".page-subtitle")?.replaceChildren(document.createTextNode("Manage customer entries and due dates."));
      } else {
        document.querySelector(".page-title")?.replaceChildren(document.createTextNode("Dashboard"));
        document.querySelector(".page-subtitle")?.replaceChildren(document.createTextNode("Track collections and follow up faster."));
      }
    });
  });

  wireModalDismissHandlers({
    onCloseCustomer: () => closeCustomerModal(),
    onCloseConfirm: () => {
      pendingDeleteId = null;
      closeConfirmDeleteModal();
    },
  });

  el("customer-form").addEventListener("submit", (e) => {
    e.preventDefault();
    setCustomerFormNotice({ message: "", tone: "" });

    const id = el("customerId").value || "";
    const name = el("customerName").value;
    const phone = el("customerPhone").value;
    const amount = el("customerAmount").value;
    const dueDate = el("customerDueDate").value;

    if (!isValidDateISO(dueDate)) {
      setCustomerFormNotice({ message: "Please choose a valid due date.", tone: "warning" });
      return;
    }

    (async () => {
      try {
        if (id) {
          await updateCustomer(id, { name, phone, amount, dueDate });
          setCustomerFormNotice({ message: "Customer updated.", tone: "success" });
        } else {
          await addCustomer({ name, phone, amount, dueDate });
          setCustomerFormNotice({ message: "Customer added.", tone: "success" });
        }
        await refresh();
        setTimeout(() => closeCustomerModal(), 250);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unable to save customer.";
        setCustomerFormNotice({ message: msg, tone: "danger" });
      }
    })();
  });

  el("btn-confirm-delete").addEventListener("click", () => {
    if (!pendingDeleteId) return;
    (async () => {
      try {
        await deleteCustomer(pendingDeleteId);
        pendingDeleteId = null;
        closeConfirmDeleteModal();
        await refresh();
      } catch {
        pendingDeleteId = null;
        closeConfirmDeleteModal();
      }
    })();
  });
}

function init() {
  initAuth();
  initDashboard();
  route();

  if (location.protocol === "file:") {
    setAuthNotice({
      message:
        "This app now needs to be opened via the backend server. Start the backend, then open http://localhost:5000/",
      tone: "warning",
    });
  }

  window.addEventListener("error", (e) => {
    setAppNotice({
      message: `App error: ${e.message || "Unknown error"}`,
      tone: "danger",
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason instanceof Error ? e.reason.message : String(e.reason || "Unknown error");
    setAppNotice({
      message: `Request error: ${reason}`,
      tone: "danger",
    });
  });
}

// Initialize the application
init();
