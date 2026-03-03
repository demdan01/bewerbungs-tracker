
import { loadApps, saveApps } from "./storage.js";

/*DOM References*/
const btnNew = document.getElementById("btnNew");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const btnExportCsv = document.getElementById("btnExportCsv");

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

  const company = document.createElement("div");
  company.classList.add("card__company");
  company.textContent = app.company;

  const role = document.createElement("div");
  role.classList.add("card__role");
  role.textContent = app.role;

  const meta = document.createElement("div");
  meta.classList.add("card__meta");
  meta.textContent = app.appliedAt ?? "";

  article.appendChild(company);
  article.appendChild(role);
  article.appendChild(meta);

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

function debugAddTestEntry() {
  state.apps.unshift(
    { id: Date.now().toString(), company: "Test Firma", role: "Testrolle", status: "rejected" }
  );
  saveApps(state.apps);
  render();
}

 window.debugAddTestEntry = debugAddTestEntry;

init();