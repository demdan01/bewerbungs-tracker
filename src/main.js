import { loadApps, saveApps, STORAGE_KEY } from "./storage.js";

/*DOM References*/
const btnNew = document.getElementById("btnNew");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const btnExportCsv = document.getElementById("btnExportCsv");
const boardTrackEl = document.querySelector(".board__track");

const modalEl = document.getElementById("appModal");
const formEl = document.getElementById("appForm");
const companyInput = document.getElementById("companyInput");
const roleInput = document.getElementById("roleInput");
const statusInput = document.getElementById("statusInput");
const dateInput = document.getElementById("dateInput");
const linkInput = document.getElementById("linkInput");
const cancelBtn = document.getElementById("cancelBtn");
const errorMessage = document.getElementById("errorMessage");

const modalTitle = document.getElementById("modalTitle");
const saveBtn = document.getElementById("saveBtn");

/*Status constants*/
const STATUSES = ["open", "interview", "test", "offer", "rejected"];

/* Map: status -> column body (render target for cards) */
const bodyEls = document.querySelectorAll(".column__body[data-list]");
const bodiesByStatus = {};

bodyEls.forEach((el) => {
  const status = el.dataset.list;
  bodiesByStatus[status] = el;
});

STATUSES.forEach((s) => {
  if (!bodiesByStatus[s]) {
    throw new Error(`Missing column body for status: ${s}`);
  }
});

/* Map: status -> badge element (for counts) */
const columnEls = document.querySelectorAll(".column[data-status]");
const badgesByStatus = {};

columnEls.forEach((colEl) => {
  const status = colEl.dataset.status;
  const badgeEl = colEl.querySelector(".column__badge");

  if (!badgeEl) {
    throw new Error(`Missing .column__badge inside column: ${status}`);
  }

  badgesByStatus[status] = badgeEl;
});

STATUSES.forEach((status) => {
  if (!badgesByStatus[status]) {
    throw new Error(`Missing badge mapping for status: ${status}`);
  }
});

const state = {
  apps: [],
  query: "",
  statusFilter: "all",
  editingId: null,
};

function clearColumns() {
  STATUSES.forEach((status) => {
    const bodyEl = bodiesByStatus[status];
    if (!bodyEl) throw new Error(`Missing column body for status: ${status}`);
    bodyEl.innerHTML = "";
  });
}

function render() {
  clearColumns();

  const countsByStatus = {};

  const fragsByStatus = {};

  STATUSES.forEach((s) => {
    countsByStatus[s] = 0;
    fragsByStatus[s] = document.createDocumentFragment();
  });

  const visibleApps = getVisibleApps();

  visibleApps.forEach((app) => {
    const status = normalizeStatus(app.status);

    const frag = fragsByStatus[status];
    if (!frag) {
      console.warn("Skipping app with invalid status:", app);
      return;
    }

    frag.appendChild(createCard(app));
    countsByStatus[status] += 1;
  });

  STATUSES.forEach((status) => {
    const bodyEl = bodiesByStatus[status];
    const badgeEl = badgesByStatus[status];

    if (!bodyEl || !badgeEl) {
      console.warn("Missing body/badge for status:", status);
      return;
    }

    const count = countsByStatus[status];

    if (count === 0) {
      const empty = document.createElement("div");
      empty.className = "column__empty";
      empty.textContent = "Keine Bewerbungen!";
      bodyEl.appendChild(empty);
    } else {
      bodyEl.appendChild(fragsByStatus[status]);
    }

    badgeEl.textContent = String(count);
  });
}

function init() {
  bindEvents();

  //const hadStorage = localStorage.getItem(STORAGE_KEY) !== null;

  state.apps = loadApps();

  /*
  if (!hadStorage) {
    state.apps = [
        { id: "1", company: "Musterfirma GmbH", role: "Fachinformatiker AE", status: "open", appliedAt: "2026-02-23", link: "#" },
        { id: "2", company: "Beispiel AG", role: "IT Support", status: "interview", appliedAt: "2026-02-20" },
        { id: "3", company: "Demo KG", role: "Systemintegration", status: "rejected" },
      ];
    saveApps(state.apps);
  }
  */

  const before = JSON.stringify(state.apps);
  const normalized = state.apps.map((a) => normalizeApp(a));
  const after = JSON.stringify(normalized);

  state.apps = normalized;

  if (before !== after) {
    saveApps(state.apps);
  }

  render();
}

function bindEvents() {
  if (bindEvents._bound) return;
  bindEvents._bound = true;

  searchInput.addEventListener("input", (e) => {
    state.query = e.target.value.trim().toLowerCase();
    render();
  });

  statusFilter.addEventListener("change", (e) => {
    state.statusFilter = e.target.value;
    render();
  });

  btnNew.addEventListener("click", () => {
    openCreateModal();
  });

  cancelBtn.addEventListener("click", () => {
    modalEl.close();
  });

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();

    const companyField = companyInput.value.trim();
    const roleField = roleInput.value.trim();
    let statusField = statusInput.value;
    const dateField = dateInput.value.trim(); 
    const linkField = linkInput.value.trim();

    clearFormError();

    const rawLink = linkField;
    const normalizedLink = normalizeLink(rawLink);

    if (rawLink && !normalizedLink) {
      setFormError("Bitte einen gültigen Link eingeben (z.B. https://...).");
      linkInput.focus();
      return;
    }

    if (!companyField) {
      setFormError("Bitte Firma eingeben!");
      companyInput.focus();
      return;
    }

    if (!roleField) {
      setFormError("Bitte Stellenbezeichnung/Position eingeben!");
      roleInput.focus();
      return;
    }

    const { ok, msg } = validateAppliedAt(dateField, dateInput.min, dateInput.max);
    if (!ok) {
      setFormError(msg);
      dateInput.focus();
      return;
    }

    statusField = normalizeStatus(statusField);

    if (state.editingId === null) {
      const newId = createId();

      state.apps.unshift({
        id: newId,
        company: companyField,
        role: roleField,
        status: statusField,
        appliedAt: dateField,
        link: normalizedLink,
      });
    } else {
      const app = state.apps.find((a) => a.id === state.editingId);
      if (!app) return;

      app.company = companyField;
      app.role = roleField;
      app.status = statusField;
      app.appliedAt = dateField;
      app.link = normalizedLink;
    }

    saveApps(state.apps);
    render();
    modalEl.close();
  });

  boardTrackEl.addEventListener("click", (e) => {
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;

    const action = actionEl.dataset.action;
    if (action !== "delete" && action !== "edit") return;

    const cardEl = actionEl.closest(".card");
    if (!cardEl) return;

    const cardId = cardEl.dataset.id;

    if (action === "delete") {
      const willDelete = confirm("Willst du diese Bewerbung wirklich löschen?");
      if (!willDelete) return;

      deleteAppById(cardId);
      return;
    }

    if (action === "edit") {
      const app = state.apps.find((a) => a.id === cardId);
      if (!app) return;

      openEditModal(app);
    }
  });

  boardTrackEl.addEventListener("change", (e) => {
    if (e.target.dataset.action !== "status") return;

    const cardEl = e.target.closest(".card");
    if (!cardEl) return;

    const cardId = cardEl.dataset.id;

    const newStatus = normalizeStatus(e.target.value);

    const app = state.apps.find((a) => a.id === cardId);
    if (!app) return;

    app.status = newStatus;
    saveApps(state.apps);
    render();
  });

  btnExportCsv.addEventListener("click", () => {
    const csv = toCsv(getVisibleApps());
    downloadCsv(csv, "bewerbungen.csv");
  });

  modalEl.addEventListener("close", () => {
    resetModalState();
  });

  companyInput.addEventListener("input", () => {
    clearFormError();
  });

  roleInput.addEventListener("input", () => {
    clearFormError();
  });

  dateInput.addEventListener("input", () => {
    clearFormError();
  });
}

function createCard(app) {
  const article = document.createElement("article");
  article.classList.add("card");
  article.dataset.id = app.id;

  const company = document.createElement("div");
  company.classList.add("card__company");
  company.textContent = app.company;

  const role = document.createElement("div");
  role.classList.add("card__role");
  role.textContent = app.role;

  const meta = document.createElement("div");
  meta.classList.add("card__meta");
  meta.textContent = app.appliedAt ?? "";

  const actionsTop = document.createElement("div");
  actionsTop.classList.add("card__actions--top");

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.classList.add("card__icon-btn");
  editBtn.dataset.action = "edit";
  editBtn.setAttribute("aria-label", "Bearbeiten");
  editBtn.textContent = "✎";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.classList.add("card__icon-btn");
  deleteBtn.dataset.action = "delete";
  deleteBtn.setAttribute("aria-label", "Löschen");
  deleteBtn.textContent = "×";

  actionsTop.appendChild(editBtn);
  actionsTop.appendChild(deleteBtn);

  const cardStatusDropdown = document.createElement("select");
  cardStatusDropdown.classList.add("card__status");
  cardStatusDropdown.dataset.action = "status";

  cardStatusDropdown.add(new Option("Offen", "open"));
  cardStatusDropdown.add(new Option("Bewerbungsgespräch", "interview"));
  cardStatusDropdown.add(new Option("Test", "test"));
  cardStatusDropdown.add(new Option("Angebot", "offer"));
  cardStatusDropdown.add(new Option("Abgelehnt", "rejected"));

    cardStatusDropdown.value = STATUSES.includes(app.status) ? app.status : "open";

  article.appendChild(actionsTop);
  article.appendChild(company);
  article.appendChild(role);
  article.appendChild(meta);
  article.appendChild(cardStatusDropdown);

  if (app.link) {
    const link = document.createElement("a");
    link.classList.add("card__link");
    link.href = app.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Link";
    article.appendChild(link);
  }

  return article;
}

function matchesQuery(app, query) {
  if (!query) return true;

  const q = query.toLowerCase();
  const company = app.company?.toLowerCase() ?? "";
  const role = app.role?.toLowerCase() ?? "";

  return company.includes(q) || role.includes(q);
}

function matchesStatus(app, statusFilter) {
  if (statusFilter === "all") return true;
  return app.status === statusFilter;
}

function escapeCsvValue(value, delimiter = ";") {
  const s = value == null ? "" : String(value);

  const mustQuote =
    s.includes('"') || s.includes("\n") || s.includes("\r") || s.includes(delimiter);

  if (!mustQuote) return s;

  const escaped = s.replace(/"/g, '""');
  return `"${escaped}"`;
}

function toCsv(apps) {
  const delimiter = ";";
  const headers = ["ID", "Firma", "Stellenbezeichnung", "Status", "Beworben am", "Link"];

  const lines = [];
  lines.push(headers.join(delimiter));

  apps.forEach((app) => {
    const row = [app.id, app.company, app.role, app.status, app.appliedAt, app.link].map((v) =>
      escapeCsvValue(v, delimiter)
    );

    lines.push(row.join(delimiter));
  });

  return "\ufeff" + lines.join("\r\n");
}

function downloadCsv(csvString, filename) {
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function getVisibleApps() {
  return state.apps.filter((app) => {
    return matchesQuery(app, state.query) && matchesStatus(app, state.statusFilter);
  });
}

function resetModalState() {
  state.editingId = null;
  formEl.reset();
  statusInput.value = "open";
  clearFormError();
}

function setFormError(message) {
  errorMessage.textContent = message;
}

function clearFormError() {
  errorMessage.textContent = "";
}

function normalizeStatus(value) {
  if (STATUSES.includes(value)) return value;
  return "open";
}

function normalizeLink(value) {
  const v = (value ?? "").trim();
  if (!v) return "";

  let url = v;

  const hasScheme = /^https?:\/\//i.test(url);
  if (!hasScheme) {
    if (url.startsWith("www.")) url = "https://" + url;
    else if (url.includes(".") && !/\s/.test(url)) url = "https://" + url;
    else return "";
  }

  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    return u.toString();
  } catch {
    return "";
  }
}

function normalizeApp(a) {
  const app = a ?? {};
  return {
    id: String(app.id ?? Date.now()),
    company: String(app.company ?? "").trim(),
    role: String(app.role ?? "").trim(),
    status: normalizeStatus(app.status),
    appliedAt: normalizeAppliedAt(app.appliedAt, dateInput.min, dateInput.max),
    link: normalizeLink(app.link),
  };
}

function normalizeAppliedAt(value, min, max) {
  const v = String(value ?? "").trim();
  if (!v) return "";

  if (!isValidDate(v)) return "";

  if (min && v < min) return "";
  if (max && v > max) return "";

  return v;
}

function isValidDate(value) {
  if (!value) return true;

  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!iso.test(value)) return false;

  const [yStr, mStr, dStr] = value.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  const dt = new Date(Date.UTC(y, m - 1, d));

  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function validateAppliedAt(value, min, max) {
  const v = (value ?? "").trim();
  if (!v) return { ok: true };

  if (!isValidDate(v)) {
    return { ok: false, msg: "Bitte ein gültiges Datum auswählen (YYYY-MM-DD)." };
  }

  if (min && v < min) {
    return { ok: false, msg: `Datum darf nicht vor ${min} liegen.` };
  }
  if (max && v > max) {
    return { ok: false, msg: `Datum darf nicht nach ${max} liegen.` };
  }

  return { ok: true };
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function openCreateModal() {
  state.editingId = null;
  formEl.reset();
  statusInput.value = "open";
  modalTitle.textContent = "Neue Bewerbung anlegen";
  saveBtn.textContent = "Speichern";
  clearFormError();
  modalEl.showModal();
  companyInput.focus();
}

function openEditModal(app) {
  state.editingId = app.id;
  formEl.reset();
  modalTitle.textContent = "Bewerbung bearbeiten";
  saveBtn.textContent = "Änderungen speichern";

  companyInput.value = app.company ?? "";
  roleInput.value = app.role ?? "";
  statusInput.value = STATUSES.includes(app.status) ? app.status : "open";
  dateInput.value = app.appliedAt ?? "";
  linkInput.value = app.link ?? "";

  clearFormError();
  modalEl.showModal();
  companyInput.focus();
}

function deleteAppById(cardId) {
  if (cardId == null) return false;

  const id = String(cardId).trim();
  if (id === "") return false;

  const index = state.apps.findIndex((app) => String(app.id) === id);
  if (index === -1) return false;

  state.apps.splice(index, 1);
  saveApps(state.apps);
  render();
  return true;
}

init();
