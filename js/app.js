import {
  addCustomer,
  deleteCustomer,
  getActiveSession,
  getCustomers,
  logout,
  markCustomerPaid,
  updateCustomer,
  verifyLicense,
} from "./state.js";
import {
  closeConfirmDeleteModal,
  closeCustomerModal,
  openConfirmDeleteModal,
  openCustomerModal,
  renderCustomersTable,
  setAppNotice,
  setAuthNotice,
  setCustomerFormNotice,
  setUserPill,
  setView,
  updateStats,
  wireModalDismissHandlers,
} from "./ui.js";

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

    el("btn-verify").setAttribute("disabled", "true");
    el("btn-verify").textContent = "Verifying…";

    await new Promise((r) => setTimeout(r, 550));
    const result = verifyLicense(payload);

    el("btn-verify").removeAttribute("disabled");
    el("btn-verify").textContent = "Verify License";

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

init();

