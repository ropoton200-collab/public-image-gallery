const $ = s => document.querySelector(s);
const form = $("#uploadForm");
const fileInput = $("#file");
const preview = $("#preview");
const statusEl = $("#status");
const submitButton = $("#submitButton");

$("#date").value = new Date().toISOString().slice(0, 10);

for (const id of ["owner", "repo", "branch"]) {
  const el = $("#" + id);
  const saved = localStorage.getItem("gallery_" + id);
  if (saved) el.value = saved;
  el.addEventListener("change", () => localStorage.setItem("gallery_" + id, el.value.trim()));
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) {
    preview.style.display = "none";
    return;
  }
  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
  if (!$("#title").value) {
    $("#title").value = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  }
});

function showStatus(message, kind = "") {
  statusEl.hidden = false;
  statusEl.className = "status" + (kind ? " " + kind : "");
  statusEl.textContent = message;
}

function slugify(value) {
  return value.toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "image";
}

function utf8ToB64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function b64ToUtf8(b64) {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function htmlEscape(value = "") {
  return value.replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[ch]);
}

function xmlEscape(value = "") {
  return value.replace(/[<>&'"]/g, ch => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;"
  })[ch]);
}

function getConfig() {
  const owner = $("#owner").value.trim();
  const repo = $("#repo").value.trim();
  const branch = $("#branch").value.trim() || "main";
  const token = $("#token").value.trim();
  if (!owner || !repo || !token) throw new Error("Enter your GitHub owner, repository, and token.");
  return { owner, repo, branch, token };
}

async function api(path, options = {}) {
  const cfg = getConfig();
  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}${path}`, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${cfg.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status}: ${text}`);
  }
  return response.status === 204 ? null : response.json();
}

async function getRepoFile(path) {
  const cfg = getConfig();
  try {
    return await api(`/contents/${path}?ref=${encodeURIComponent(cfg.branch)}`);
  } catch (e) {
    if (String(e.message).includes("GitHub API 404")) return null;
    throw e;
  }
}

async function putRepoFile(path, base64Content, message) {
  const cfg = getConfig();
  const current = await getRepoFile(path);
  const body = {
    message,
    content: base64Content,
    branch: cfg.branch
  };
  if (current?.sha) body.sha = current.sha;

  return api(`/contents/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function siteBaseUrl() {
  return new URL("./", location.href).href;
}

function buildImagePage(item) {
  const base = siteBaseUrl();
  const imageUrl = new URL(item.src, base).href;
  const pageUrl = new URL(item.page, base).href;

  const ld = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "name": item.title,
    "description": item.description || item.alt,
    "contentUrl": imageUrl,
    "url": pageUrl,
    "uploadDate": item.date,
    "caption": item.alt
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(item.title)} — Public Image Gallery</title>
  <meta name="description" content="${htmlEscape(item.description || item.alt)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${htmlEscape(pageUrl)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${htmlEscape(item.title)}">
  <meta property="og:description" content="${htmlEscape(item.description || item.alt)}">
  <meta property="og:image" content="${htmlEscape(imageUrl)}">
  <meta property="og:url" content="${htmlEscape(pageUrl)}">
  <link rel="stylesheet" href="../styles.css">
  <script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
  <main class="admin-shell">
    <a href="../index.html">← Back to gallery</a>
    <article class="panel">
      <p class="eyebrow">UPLOAD #${item.order} • ${htmlEscape(item.date)}</p>
      <h1>${htmlEscape(item.title)}</h1>
      <figure style="margin:22px 0 0">
        <img src="../${htmlEscape(item.src)}" alt="${htmlEscape(item.alt)}"
             style="display:block;max-width:100%;height:auto;margin:auto;border-radius:14px">
        <figcaption style="margin-top:14px;color:#5b6679">${htmlEscape(item.alt)}</figcaption>
      </figure>
      ${item.description ? `<p style="line-height:1.6">${htmlEscape(item.description)}</p>` : ""}
    </article>
  </main>
</body>
</html>`;
}

function buildSitemap(items) {
  const base = siteBaseUrl();
  const urls = [
    `<url><loc>${xmlEscape(new URL("index.html", base).href)}</loc></url>`,
    ...items.map(i => `<url><loc>${xmlEscape(new URL(i.page, base).href)}</loc><lastmod>${xmlEscape(i.date)}</lastmod></url>`)
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
}

function buildImageSitemap(items) {
  const base = siteBaseUrl();
  const rows = items.map(i => {
    const pageUrl = new URL(i.page, base).href;
    const imageUrl = new URL(i.src, base).href;
    return `<url>
  <loc>${xmlEscape(pageUrl)}</loc>
  <image:image>
    <image:loc>${xmlEscape(imageUrl)}</image:loc>
    <image:title>${xmlEscape(i.title)}</image:title>
    <image:caption>${xmlEscape(i.alt)}</image:caption>
  </image:image>
</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${rows.join("\n")}
</urlset>`;
}

async function readGallery() {
  const file = await getRepoFile("gallery.json");
  if (!file) return [];
  return JSON.parse(b64ToUtf8(file.content));
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  submitButton.disabled = true;

  try {
    const file = fileInput.files[0];
    if (!file) throw new Error("Choose an image.");

    if (file.size > 10 * 1024 * 1024) {
      throw new Error("For this simple setup, keep each image under 10 MB.");
    }

    getConfig();

    const title = $("#title").value.trim();
    const alt = $("#alt").value.trim();
    const description = $("#description").value.trim();
    const date = $("#date").value;
    if (!title || !alt || !date) throw new Error("Title, date, and alt text are required.");

    showStatus("Reading current gallery…");

    const gallery = await readGallery();
    const nextOrder = gallery.reduce((m, x) => Math.max(m, Number(x.order) || 0), 0) + 1;

    const extRaw = (file.name.split(".").pop() || "jpg").toLowerCase();
    const ext = ["jpg", "jpeg", "png", "webp", "gif"].includes(extRaw) ? extRaw : "jpg";
    const stamp = Date.now();
    const slug = `${String(nextOrder).padStart(4, "0")}-${slugify(title)}-${stamp}`;
    const imagePath = `images/${slug}.${ext}`;
    const pagePath = `image-pages/${slug}.html`;

    const item = {
      order: nextOrder,
      date,
      title,
      alt,
      description,
      src: imagePath,
      page: pagePath
    };

    showStatus("Uploading image…");
    const imageB64 = await fileToBase64(file);
    await putRepoFile(imagePath, imageB64, `Add image #${nextOrder}: ${title}`);

    showStatus("Creating searchable image page…");
    await putRepoFile(pagePath, utf8ToB64(buildImagePage(item)), `Add page for image #${nextOrder}`);

    const updatedGallery = [...gallery, item];
    showStatus("Updating gallery…");
    await putRepoFile("gallery.json", utf8ToB64(JSON.stringify(updatedGallery, null, 2)), `Update gallery for image #${nextOrder}`);

    showStatus("Updating sitemaps…");
    await putRepoFile("sitemap.xml", utf8ToB64(buildSitemap(updatedGallery)), `Update sitemap for image #${nextOrder}`);
    await putRepoFile("image-sitemap.xml", utf8ToB64(buildImageSitemap(updatedGallery)), `Update image sitemap for image #${nextOrder}`);

    showStatus(
      `Published successfully ✅\nUpload #${nextOrder}\n\nGitHub Pages may take a minute or two to deploy the commit. Google indexing is not instant or guaranteed.`,
      "ok"
    );

    form.reset();
    $("#date").value = new Date().toISOString().slice(0, 10);
    preview.style.display = "none";
  } catch (err) {
    showStatus(err.message || String(err), "error");
  } finally {
    submitButton.disabled = false;
  }
});
