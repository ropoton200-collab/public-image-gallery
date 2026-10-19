const galleryEl = document.querySelector("#gallery");
const countEl = document.querySelector("#count");
const sortEl = document.querySelector("#sort");

let items = [];

function formatDate(iso) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[ch]);
}

function render() {
  const sorted = [...items].sort((a, b) => {
    return sortEl.value === "oldest" ? a.order - b.order : b.order - a.order;
  });

  countEl.textContent = `${items.length} image${items.length === 1 ? "" : "s"}`;

  if (!sorted.length) {
    galleryEl.innerHTML = `
      <div class="empty">
        <h2>No images yet</h2>
        <p>The owner can add the first image from the Owner Upload page.</p>
      </div>`;
    return;
  }

  galleryEl.innerHTML = sorted.map(item => `
    <article class="card">
      <a class="image-link" href="${escapeHtml(item.page)}">
        <img
          src="${escapeHtml(item.src)}"
          alt="${escapeHtml(item.alt || item.title)}"
          loading="lazy"
          decoding="async"
        >
      </a>
      <div class="card-body">
        <div class="meta">
          <span class="pill">Upload #${item.order}</span>
          <span class="pill">${escapeHtml(formatDate(item.date))}</span>
        </div>
        <h2><a href="${escapeHtml(item.page)}">${escapeHtml(item.title)}</a></h2>
        ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
      </div>
    </article>
  `).join("");
}

fetch("gallery.json", { cache: "no-store" })
  .then(r => {
    if (!r.ok) throw new Error("Could not load gallery.json");
    return r.json();
  })
  .then(data => {
    items = Array.isArray(data) ? data : [];
    render();
  })
  .catch(err => {
    galleryEl.innerHTML = `<div class="empty"><h2>Gallery unavailable</h2><p>${escapeHtml(err.message)}</p></div>`;
  });

sortEl.addEventListener("change", render);
