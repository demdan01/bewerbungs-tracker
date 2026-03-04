
import { loadApps, saveApps } from "./storage.js";

/*DOM References*/
const btnNew          = document.getElementById("btnNew");
const searchInput     = document.getElementById("searchInput");
const statusFilter    = document.getElementById("statusFilter");
const btnExportCsv    = document.getElementById("btnExportCsv");
const boardTrackEl    = document.querySelector(".board__track");

const modalEl         = document.getElementById("appModal");
const formEl          = document.getElementById("appForm");
const companyInput    = document.getElementById("companyInput");
const roleInput       = document.getElementById("roleInput");
const statusInput     = document.getElementById("statusInput");
const dateInput       = document.getElementById("dateInput");
const linkInput       = document.getElementById("linkInput");
const cancelBtn       = document.getElementById("cancelBtn");




/*Status constants*/
const STATUSES = ["open","interview","test","offer","rejected"];

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
  editingId: null
}

function render() {
  clearColumns()
  
  const countsByStatus = {};
  STATUSES.forEach((s) => (countsByStatus[s] = 0));

  const visibleApps = getVisibleApps();

  visibleApps.forEach((app) => {
  const targetBody = bodiesByStatus[app.status];
  if (!targetBody) {
  console.warn("Skipping app with invalid status:", app);
  return;
  }
  const cardEl = createCard(app);
  targetBody.append(cardEl);
  countsByStatus[app.status] += 1;
});

STATUSES.forEach((s) => {
  const badgeEl = badgesByStatus[s];
  badgeEl.textContent = countsByStatus[s];
});
}

function init() {
  bindEvents();

  state.apps = loadApps();

  if (state.apps.length === 0) {
    state.apps = [
      { id: "1", company: "Musterfirma GmbH", role: "Fachinformatiker AE", status: "open", appliedAt: "2026-02-23", link: "#" },
      { id: "2", company: "Beispiel AG", role: "IT Support", status: "interview", appliedAt: "2026-02-20" },
      { id: "3", company: "Demo KG", role: "Systemintegration", status: "rejected" },
    ];
    saveApps(state.apps);
  }

  render();
}

function bindEvents() {
  if (bindEvents._bound) return;
  bindEvents._bound = true;

  // Search
  searchInput.addEventListener("input", (e) => {
    state.query = e.target.value.trim().toLowerCase();
    render();
  });

  statusFilter.addEventListener("change", (e) => {
    state.statusFilter = e.target.value;
    render();
  });

  btnNew.addEventListener("click", () => {
    state.editingId = null;
    formEl.reset();
    statusInput.value = "open";
    modalEl.showModal();
  });

  cancelBtn.addEventListener("click", () => {
    state.editingId = null;
    modalEl.close();
    formEl.reset();
    statusInput.value = "open";
  });

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();

    const companyField = companyInput.value.trim();
    const roleField = roleInput.value.trim();
    let statusField = statusInput.value;
    const dateField = dateInput.value;
    const linkField = linkInput.value.trim();

    if (!companyField || !roleField) return;
    if (!STATUSES.includes(statusField)) statusField = "open";

    if (state.editingId === null) {
      const newId = Date.now().toString();

      state.apps.unshift({
        id: newId,
        company: companyField,
        role: roleField,
        status: statusField,
        appliedAt: dateField,
        link: linkField,
      });
    } else {
      const app = state.apps.find((a) => a.id === state.editingId);
      if (!app) return;

      app.company = companyField;
      app.role = roleField;
      app.status = statusField;
      app.appliedAt = dateField;
      app.link = linkField;

      state.editingId = null;
    }

    saveApps(state.apps);
    render();

    modalEl.close();
    formEl.reset();
    statusInput.value = "open";
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
      const willDelete = confirm("Willst du das wirklich löschen?");
      if (!willDelete) return;

      const index = state.apps.findIndex((app) => app.id === cardId);
      if (index === -1) return;

      state.apps.splice(index, 1);
      saveApps(state.apps);
      render();
      return;
    }

    if (action === "edit") {
      const app = state.apps.find((a) => a.id === cardId);
      if (!app) return;

      state.editingId = cardId;

      companyInput.value = app.company ?? "";
      roleInput.value = app.role ?? "";
      statusInput.value = STATUSES.includes(app.status) ? app.status : "open";
      dateInput.value = app.appliedAt ?? "";
      linkInput.value = app.link ?? "";

      modalEl.showModal();
    }
  });

  boardTrackEl.addEventListener("change", (e) => {
    if (e.target.dataset.action !== "status") return;

    const cardEl = e.target.closest(".card");
    if (!cardEl) return;

    const cardId = cardEl.dataset.id;
    const newStatus = e.target.value;

    if (!STATUSES.includes(newStatus)) return;

    const app = state.apps.find((a) => a.id === cardId);
    if (!app) return;

    app.status = newStatus;
    saveApps(state.apps);
    render();
  });

  btnExportCsv.addEventListener("click", () => {
    const csv = toCsv(state.apps);
    downloadCsv(csv, "bewerbungen.csv");
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

  const deleteButton = document.createElement("button");
  deleteButton.classList.add("card__delete");
  deleteButton.setAttribute("data-action", "delete");
  deleteButton.textContent = "Löschen";

  const cardStatusDropdown = document.createElement("select");
  cardStatusDropdown.classList.add("card__status");
  cardStatusDropdown.dataset.action = "status";

  cardStatusDropdown.add(new Option("Offen", "open"));
  cardStatusDropdown.add(new Option("Bewerbungsgespräch", "interview"));
  cardStatusDropdown.add(new Option("Test", "test"));
  cardStatusDropdown.add(new Option("Angebot", "offer"));
  cardStatusDropdown.add(new Option("Abgelehnt", "rejected"));

  cardStatusDropdown.value = app.status;

  const editCardBtn = document.createElement("button");
  editCardBtn.dataset.action = "edit";
  editCardBtn.textContent = "Bearbeiten";

  article.appendChild(company);
  article.appendChild(role);
  article.appendChild(meta);
  article.appendChild(editCardBtn);
  article.appendChild(deleteButton);
  article.appendChild(cardStatusDropdown);

  if (app.link) {
    const link = document.createElement("a");
    link.classList.add("card__link");
    link.href = app.link;
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
  const headers = ["id", "company", "role", "status", "appliedAt", "link"];

  const lines = [];
  lines.push(headers.join(delimiter));

  apps.forEach((app) => {
    const row = [
      app.id,
      app.company,
      app.role,
      app.status,
      app.appliedAt,
      app.link,
    ].map((v) => escapeCsvValue(v, delimiter));

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

init();