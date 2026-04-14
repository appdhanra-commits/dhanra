import { getCustomerStatus } from "./state.js";

const fmtINR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function el(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element: #${id}`);
  return node;
}

export function setView(view) {
  const auth = el("view-auth");
  const dash = el("view-dashboard");

  const showAuth = view === "auth";
  auth.style.display = showAuth ? "grid" : "none";
  dash.style.display = showAuth ? "none" : "block";

  auth.setAttribute("aria-hidden", String(!showAuth));
  dash.setAttribute("aria-hidden", String(showAuth));

  document.title = showAuth ? "Dhanra – Access" : "Dhanra – Dashboard";
}

export function setUserPill(session) {
  el("user-business").textContent = session?.businessName || "Business";
  const sub = session?.ifsc ? `${session.ifsc} • ${session.bankAccountMasked || "••••"}` : "License verified";
  el("user-sub").textContent = sub;
}

export function setAuthNotice({ message, tone }) {
  const n = el("auth-notice");
  n.hidden = !message;
  n.textContent = message || "";
  n.classList.remove("is-success", "is-danger", "is-warning");
  if (tone) n.classList.add(`is-${tone}`);
}

export function setCustomerFormNotice({ message, tone }) {
  const n = el("customer-notice");
  n.hidden = !message;
  n.textContent = message || "";
  n.classList.remove("is-success", "is-danger", "is-warning");
  if (tone) n.classList.add(`is-${tone}`);
}

export function setAppNotice({ message, tone }) {
  const n = document.getElementById("app-notice");
  if (!n) return;
  n.hidden = !message;
  n.textContent = message || "";
  n.classList.remove("is-success", "is-danger", "is-warning");
  if (tone) n.classList.add(`is-${tone}`);
}

export function updateStats(customers) {
  const total = customers.length;
  let pending = 0;
  let collected = 0;

  for (const c of customers) {
    const status = getCustomerStatus(c);
    if (status === "paid") collected += c.amount;
    else pending += c.amount;
  }

  el("stat-customers").textContent = String(total);
  el("stat-pending").textContent = fmtINR.format(pending);
  el("stat-collected").textContent = fmtINR.format(collected);
}

function badgeFor(status) {
  const span = document.createElement("span");
  span.className = "badge";
  const dot = document.createElement("span");
  dot.className = "badge-dot";
  const text = document.createElement("span");

  if (status === "paid") {
    span.classList.add("is-paid");
    text.textContent = "Paid";
  } else if (status === "overdue") {
    span.classList.add("is-overdue");
    text.textContent = "Overdue";
  } else {
    span.classList.add("is-unpaid");
    text.textContent = "Unpaid";
  }

  span.append(dot, text);
  return span;
}

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
}

export function renderCustomersTable(customers, { query = "", statusFilter = "all" } = {}) {
  const tbody = el("customers-tbody");
  tbody.innerHTML = "";

  const normalizedQuery = String(query || "").trim().toLowerCase();
  const filtered = customers.filter((c) => {
    const status = getCustomerStatus(c);
    if (statusFilter !== "all" && status !== statusFilter) return false;
    if (!normalizedQuery) return true;
    const hay = `${c.name} ${c.phone}`.toLowerCase();
    return hay.includes(normalizedQuery);
  });

  el("table-empty").hidden = customers.length !== 0;
  const table = el("customers-table");
  table.hidden = customers.length === 0;

  if (customers.length !== 0 && filtered.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.style.color = "rgba(100, 116, 139, 0.95)";
    td.textContent = "No matching customers.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (const c of filtered) {
    const status = getCustomerStatus(c);

    const tr = document.createElement("tr");
    tr.dataset.customerId = c.id;
    if (status === "overdue") tr.classList.add("row-overdue");

    const tdName = document.createElement("td");
    tdName.textContent = c.name;

    const tdPhone = document.createElement("td");
    tdPhone.textContent = c.phone;

    const tdAmount = document.createElement("td");
    tdAmount.className = "num";
    tdAmount.textContent = fmtINR.format(c.amount);

    const tdDue = document.createElement("td");
    tdDue.textContent = formatDate(c.dueDate);

    const tdStatus = document.createElement("td");
    tdStatus.appendChild(badgeFor(status));

    const tdPaid = document.createElement("td");
    tdPaid.textContent = c.paidAt ? formatDate(c.paidAt) : "—";

    const tdActions = document.createElement("td");
    tdActions.className = "actions";
    const actions = document.createElement("div");
    actions.className = "row-actions";

    const btnPaid = document.createElement("button");
    btnPaid.className = "icon-btn";
    btnPaid.type = "button";
    if (status === "paid") {
      btnPaid.title = "Paid";
      btnPaid.textContent = "✓";
      btnPaid.setAttribute("disabled", "true");
      btnPaid.style.opacity = "0.6";
      btnPaid.style.cursor = "not-allowed";
    } else {
      btnPaid.title = "Mark paid";
      btnPaid.dataset.action = "mark-paid";
      btnPaid.textContent = "✓";
    }

    const btnEdit = document.createElement("button");
    btnEdit.className = "icon-btn";
    btnEdit.type = "button";
    btnEdit.title = "Edit";
    btnEdit.dataset.action = "edit";
    btnEdit.textContent = "✎";

    const btnDel = document.createElement("button");
    btnDel.className = "icon-btn";
    btnDel.type = "button";
    btnDel.title = "Delete";
    btnDel.dataset.action = "delete";
    btnDel.textContent = "🗑";

    actions.append(btnPaid, btnEdit, btnDel);
    tdActions.appendChild(actions);

    tr.append(tdName, tdPhone, tdAmount, tdDue, tdStatus, tdPaid, tdActions);
    tbody.appendChild(tr);
  }
}

function modal(id) {
  return el(id);
}

function openModal(backdropEl) {
  backdropEl.hidden = false;
  backdropEl.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal(backdropEl) {
  backdropEl.hidden = true;
  backdropEl.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

export function openCustomerModal({ mode, customer }) {
  const m = modal("modal-customer");
  el("modal-title").textContent = mode === "edit" ? "Edit customer" : "Add customer";
  el("modal-sub").textContent =
    mode === "edit" ? "Update details and save." : "Create a new payment entry.";

  el("customerId").value = customer?.id || "";
  el("customerName").value = customer?.name || "";
  el("customerPhone").value = customer?.phone || "";
  el("customerAmount").value = customer?.amount ?? "";
  el("customerDueDate").value = customer?.dueDate || "";

  setCustomerFormNotice({ message: "", tone: "" });
  openModal(m);

  setTimeout(() => {
    el("customerName").focus();
  }, 0);
}

export function closeCustomerModal() {
  closeModal(modal("modal-customer"));
}

export function openConfirmDeleteModal({ customer }) {
  const m = modal("modal-confirm");
  const body = el("confirm-body");
  body.innerHTML = "";

  const lines = [
    { k: "Name", v: customer?.name || "—" },
    { k: "Phone", v: customer?.phone || "—" },
    { k: "Amount", v: customer ? fmtINR.format(customer.amount) : "—" },
    { k: "Due", v: customer?.dueDate ? formatDate(customer.dueDate) : "—" },
  ];

  for (const row of lines) {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.gap = "12px";
    div.style.padding = "6px 0";
    const k = document.createElement("div");
    k.style.color = "rgba(100, 116, 139, 0.95)";
    k.style.fontWeight = "700";
    k.textContent = row.k;
    const v = document.createElement("div");
    v.style.fontVariantNumeric = "tabular-nums";
    v.textContent = row.v;
    div.append(k, v);
    body.appendChild(div);
  }

  openModal(m);
}

export function closeConfirmDeleteModal() {
  closeModal(modal("modal-confirm"));
}

export function wireModalDismissHandlers({ onCloseCustomer, onCloseConfirm }) {
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;

    const close = t.closest("[data-close]");
    if (close) {
      const which = close.getAttribute("data-close");
      if (which === "customer") onCloseCustomer();
      if (which === "confirm") onCloseConfirm();
      return;
    }

    if (t.id === "modal-customer") onCloseCustomer();
    if (t.id === "modal-confirm") onCloseConfirm();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const m1 = modal("modal-customer");
    const m2 = modal("modal-confirm");
    if (!m2.hidden) onCloseConfirm();
    else if (!m1.hidden) onCloseCustomer();
  });
}

