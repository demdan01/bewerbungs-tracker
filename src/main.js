

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