
import { loadApps, saveApps } from "./storage.js";

/*DOM References*/
const btnNew = document.getElementById("btnNew");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const btnExportCsv = document.getElementById("btnExportCsv");
const boardTrackEl = document.querySelector(".board__track");

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

  const visibleApps = state.apps.filter((app) => {
  return matchesQuery(app, state.query) && matchesStatus(app, state.statusFilter);
});

  visibleApps.forEach((app) => {
  const targetBody = bodiesByStatus[app.status];
  if (!targetBody) throw new Error("targetBody is undefined!");
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

searchInput.addEventListener("input", (e) => {
  state.query = e.target.value.trim().toLowerCase();
  render();
});

statusFilter.addEventListener("change", (e) => {
  state.statusFilter = e.target.value;
  render();
});

btnNew.addEventListener("click", () => {
  state.apps.unshift({
    id: Date.now().toString(),
    company: "Neue Firma",
    role: "Neue Rolle",
    status: "open",
    appliedAt: "2026-02-23",
    link: "#",
  });

  saveApps(state.apps);
  render();
});

boardTrackEl.addEventListener("click", (e) => {
  if (e.target.dataset.action !== "delete") return;

  const cardEl = e.target.closest(".card");
  if (!cardEl) return;

  const cardId = cardEl.dataset.id;

  const willDelete = confirm("Willst du das wirklich löschen?");
  if (!willDelete) return;

  const index = state.apps.findIndex((app) => app.id === cardId);
  if (index !== -1) {
    state.apps.splice(index, 1);
    saveApps(state.apps);
    render();
  }
});

  boardTrackEl.addEventListener("change", (e) => {
  if (e.target.dataset.action !== "status") return;

  const cardEl = e.target.closest(".card");
  if (!cardEl) return;

  const cardId = cardEl.dataset.id;
  const newStatus = e.target.value;

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

function clearColumns() {
  STATUSES.forEach((status) => {
    const bodyEl = bodiesByStatus[status];
    if (!bodyEl) throw new Error(`Missing body element for status: ${status}`);
    bodyEl.innerHTML = "";
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

  article.appendChild(company);
  article.appendChild(role);
  article.appendChild(meta);
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

init();