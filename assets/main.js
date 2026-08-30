import { content } from "./content.js";

const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
const finePointer = window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches ?? false;
const HTTP_PROTOCOLS = new Set(["http:", "https:"]);
const LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

function $(selector, root = document) {
  return root.querySelector(selector);
}

function $all(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function clamp(min, value, max) {
  return Math.max(min, Math.min(max, value));
}

function hueForString(input) {
  const str = String(input ?? "");
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 360;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeUrl(url, { allowMailto = true } = {}) {
  if (!url || typeof url !== "string") return "";
  const raw = url.trim();
  if (!raw) return "";

  if (raw.startsWith("/") || raw.startsWith("./") || raw.startsWith("../") || raw.startsWith("#")) {
    return raw;
  }

  try {
    const parsed = new URL(raw, window.location.href);
    const protocol = parsed.protocol.toLowerCase();
    const allowed = allowMailto ? LINK_PROTOCOLS : HTTP_PROTOCOLS;
    if (!allowed.has(protocol)) return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function isHttpUrl(url) {
  return typeof url === "string" && (url.startsWith("https://") || url.startsWith("http://"));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCompactNumber(value) {
  try {
    return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
  } catch {
    return String(value);
  }
}

function relativeTimeFromNow(isoDate) {
  const ts = Date.parse(isoDate ?? "");
  if (!Number.isFinite(ts)) return "";
  const delta = Date.now() - ts;
  const day = 24 * 60 * 60 * 1000;
  if (delta < day) return "today";
  const days = Math.floor(delta / day);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

function formatProjectDate(isoDate) {
  const timestamp = Date.parse(isoDate ?? "");
  if (!Number.isFinite(timestamp)) return "";
  try {
    return new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(timestamp);
  } catch {
    return isoDate;
  }
}

function pickRandom(items) {
  if (!Array.isArray(items) || !items.length) return "";
  return items[Math.floor(Math.random() * items.length)] ?? "";
}

function getGithubUsername() {
  const githubLink = (content.person?.links ?? []).find((link) => /github/i.test(link.label ?? "") || /github\.com/i.test(link.url ?? ""));
  const href = safeUrl(githubLink?.url ?? "", { allowMailto: false });
  if (!href) return "";
  try {
    const url = new URL(href);
    if (!/github\.com$/i.test(url.hostname)) return "";
    return (url.pathname.split("/").filter(Boolean)[0] ?? "").replace(/^@/, "");
  } catch {
    return "";
  }
}

function setBindText() {
  for (const el of $all("[data-bind]")) {
    const path = el.getAttribute("data-bind");
    if (!path) continue;
    const value = path.split(".").reduce((acc, key) => (acc && acc[key] != null ? acc[key] : null), content);
    if (typeof value === "string" && value.trim()) el.textContent = value;
  }
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.dataset.show = "true";
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => {
    toast.dataset.show = "false";
  }, 1800);
}

function burstConfetti({ count = 54 } = {}) {
  if (reduceMotion) return;

  const layer = document.createElement("div");
  layer.className = "confetti-layer";

  const colors = ["#ff5f45", "#00b4d8", "#f9a826", "#58c27d", "#3f53ff", "#fff8e8"];
  const width = window.innerWidth || 1200;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti";
    const left = (i / count) * width + (Math.random() - 0.5) * 36;
    piece.style.left = `${left}px`;
    piece.style.background = colors[i % colors.length];
    piece.style.width = `${6 + Math.random() * 9}px`;
    piece.style.height = `${8 + Math.random() * 14}px`;
    piece.style.animationDelay = `${Math.random() * 160}ms`;
    piece.style.animationDuration = `${1100 + Math.random() * 900}ms`;
    piece.style.setProperty("--dx", `${(Math.random() - 0.5) * 240}px`);
    piece.style.setProperty("--rot", `${Math.random() * 180}deg`);
    layer.appendChild(piece);
  }

  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 2400);
}

async function copyToClipboard(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function setFooterYear() {
  const el = $("#footerYear");
  if (el) el.textContent = String(new Date().getFullYear());
}

function initLaClock() {
  const clock = $("#laTime");
  if (!clock) return;
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const update = () => {
    const now = new Date();
    clock.dateTime = now.toISOString();
    clock.textContent = `Los Angeles • ${formatter.format(now)}`;
  };
  update();
  window.setInterval(update, 30_000);
}

function renderImpactStats() {
  const wrap = $("#impactStats");
  if (!wrap) return;
  wrap.innerHTML = "";
  for (const stat of content.person.impact ?? []) {
    const el = document.createElement("div");
    el.className = "stat";
    el.innerHTML = `
      <div class="stat__label"></div>
      <div class="stat__value"></div>
    `;
    $(".stat__label", el).textContent = stat.label ?? "";
    $(".stat__value", el).textContent = stat.value ?? "";
    wrap.appendChild(el);
  }
}

function iconSvg(name) {
  const icons = {
    github: `
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
        <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1.1 1.9 2.9 1.4 3.6 1.1.1-.8.4-1.4.7-1.7-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5z"/>
      </svg>
    `,
    medium: `
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
        <path d="M7 7h2.4l2.7 6.2L14.9 7H17v10h-1.7V10l-2.4 5.5h-1.6L8.7 10v7H7V7Z"/>
      </svg>
    `,
    linkedin: `
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
        <path d="M20.4 20.4h-3.6v-5.6c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8v5.7H9.4V9h3.4v1.6h.1c.5-.9 1.6-1.8 3.3-1.8 3.6 0 4.2 2.3 4.2 5.4v6.2zM5.3 7.4c-1.2 0-2.2-1-2.2-2.2S4.1 3 5.3 3s2.2 1 2.2 2.2-1 2.2-2.2 2.2zM7.1 20.4H3.5V9h3.6v11.4z"/>
      </svg>
    `,
    x: `
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
        <path d="M18.8 2H22l-7 8 8.2 12h-6.4l-5-6.6L6 22H2.8l7.5-8.6L2.4 2H9l4.5 6 5.3-6Zm-1.1 17.9h1.8L8 4H6.1l11.6 15.9Z"/>
      </svg>
    `,
    mail: `
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
        <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z"/>
      </svg>
    `,
    link: `
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
        <path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.6-3.6a3 3 0 0 1 4.2 4.2l-2.2 2.2a3 3 0 0 1-4.2 0 1 1 0 1 1 1.4-1.4 1 1 0 0 0 1.4 0l2.2-2.2a1 1 0 0 0-1.4-1.4l-3.6 3.6a1 1 0 0 1-1.4 0ZM13.4 10.6a1 1 0 0 1 0 1.4l-3.6 3.6a3 3 0 0 1-4.2-4.2l2.2-2.2a3 3 0 0 1 4.2 0 1 1 0 0 1-1.4 1.4 1 1 0 0 0-1.4 0l-2.2 2.2a1 1 0 0 0 1.4 1.4l3.6-3.6a1 1 0 0 1 1.4 0Z"/>
      </svg>
    `,
  };
  return icons[name] ?? icons.link;
}

function renderSocialLinks() {
  const wrap = $("#socialLinks");
  if (!wrap) return;
  wrap.innerHTML = "";
  for (const link of content.person.links ?? []) {
    const href = safeUrl(link.url);
    if (!href) continue;
    const a = document.createElement("a");
    a.className = "pill";
    a.href = href;
    if (isHttpUrl(href)) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    a.innerHTML = `
      <span class="pill__icon">${iconSvg(link.icon ?? "link")}</span>
      <span class="pill__label"></span>
    `;
    $(".pill__label", a).textContent = link.label ?? href;
    wrap.appendChild(a);
  }
}

function renderContactLinks() {
  const wrap = $("#contactLinks");
  if (!wrap) return;
  wrap.innerHTML = "";
  for (const link of content.person.links ?? []) {
    const href = safeUrl(link.url);
    if (!href || href.startsWith("mailto:")) continue;
    const a = document.createElement("a");
    a.className = "pill";
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML = `
      <span class="pill__icon">${iconSvg(link.icon ?? "link")}</span>
      <span class="pill__label"></span>
    `;
    $(".pill__label", a).textContent = link.label ?? href;
    wrap.appendChild(a);
  }
}

function renderAbout() {
  const bullets = $("#aboutBullets");
  if (bullets) {
    bullets.innerHTML = "";
    for (const item of content.about.bullets ?? []) {
      const li = document.createElement("li");
      li.textContent = item;
      bullets.appendChild(li);
    }
  }

  const cards = $("#aboutCards");
  if (cards) {
    cards.innerHTML = "";
    for (const card of content.about.cards ?? []) {
      const el = document.createElement("div");
      el.className = "card";
      el.innerHTML = `
        <div class="card__title"></div>
        <div class="card__text"></div>
      `;
      $(".card__title", el).textContent = card.title ?? "";
      $(".card__text", el).textContent = card.text ?? "";
      cards.appendChild(el);
    }
  }
}

function renderSkills() {
  const wrap = $("#skillsGrid");
  if (!wrap) return;
  wrap.innerHTML = "";
  for (const cat of content.skills ?? []) {
    const el = document.createElement("div");
    el.className = "skill-cat";
    el.setAttribute("data-tilt", "");
    el.innerHTML = `
      <div class="skill-cat__title"></div>
      <div class="skill-cat__chips" aria-label="Skill tags"></div>
    `;
    $(".skill-cat__title", el).textContent = cat.category ?? "";
    const chips = $(".skill-cat__chips", el);
    for (const item of cat.items ?? []) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = item;
      chips.appendChild(tag);
    }
    wrap.appendChild(el);
  }
}

function renderPrinciples() {
  const wrap = $("#principlesGrid");
  if (!wrap) return;
  wrap.innerHTML = "";
  for (const principle of content.principles ?? []) {
    const el = document.createElement("article");
    el.className = "principle";
    el.setAttribute("data-tilt", "");
    el.innerHTML = `
      <div class="principle__number" aria-hidden="true"></div>
      <h3 class="principle__title"></h3>
      <p class="principle__text"></p>
      <div class="principle__tags" aria-label="Related practices"></div>
    `;
    $(".principle__number", el).textContent = principle.number ?? "";
    $(".principle__title", el).textContent = principle.title ?? "";
    $(".principle__text", el).textContent = principle.text ?? "";
    const tags = $(".principle__tags", el);
    for (const item of principle.tags ?? []) {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = item;
      tags.appendChild(tag);
    }
    wrap.appendChild(el);
  }
}

function buildFilters(projects) {
  const counts = new Map();
  for (const project of projects) {
    for (const tag of project.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const sharedTags = Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([tag]) => tag)
    .sort((a, b) => a.localeCompare(b));
  return ["All", ...sharedTags];
}

function renderProjects() {
  const projects = content.projects ?? [];
  const wrap = $("#projectsGrid");
  const filtersWrap = $("#projectFilters");
  const searchInput = $("#projectSearch");
  const sortWrap = $("#projectSorts");
  if (!wrap || !filtersWrap) return;

  let activeTag = "All";
  let activeSort = "featured";
  let query = "";
  const filters = buildFilters(projects);
  const orderBySource = new Map(projects.map((project, index) => [project, index]));

  function renderFilterButtons() {
    filtersWrap.innerHTML = "";
    for (const f of filters) {
      const btn = document.createElement("button");
      btn.className = "filter";
      btn.type = "button";
      btn.setAttribute("aria-pressed", String(f === activeTag));
      btn.textContent = f;
      btn.addEventListener("click", () => {
        activeTag = f;
        renderFilterButtons();
        renderCards();
      });
      filtersWrap.appendChild(btn);
    }
  }

  function renderSortButtons() {
    if (!sortWrap) return;
    for (const btn of $all("button[data-sort]", sortWrap)) {
      const sort = btn.getAttribute("data-sort") ?? "";
      btn.setAttribute("aria-pressed", String(sort === activeSort));
    }
  }

  function bindSortButtons() {
    if (!sortWrap) return;
    for (const btn of $all("button[data-sort]", sortWrap)) {
      btn.addEventListener("click", () => {
        activeSort = btn.getAttribute("data-sort") ?? "featured";
        renderSortButtons();
        renderCards();
      });
    }
    renderSortButtons();
  }

  function linkButton(label, href) {
    const a = document.createElement("a");
    a.textContent = label;
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    return a;
  }

  function projectMatchesQuery(project) {
    if (!query) return true;
    const haystack = [
      project.name ?? "",
      project.eyebrow ?? "",
      project.description ?? "",
      ...(project.highlights ?? []),
      ...(project.tags ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  }

  function sortProjects(items) {
    const copy = [...items];
    if (activeSort === "name") {
      copy.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
      return copy;
    }
    if (activeSort === "recent") {
      copy.sort((a, b) => {
        const aTime = Date.parse(a.updatedAt ?? "");
        const bTime = Date.parse(b.updatedAt ?? "");
        if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) return bTime - aTime;
        return (orderBySource.get(a) ?? 0) - (orderBySource.get(b) ?? 0);
      });
      return copy;
    }
    copy.sort((a, b) => {
      if (Boolean(b.featured) !== Boolean(a.featured)) return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      const aTime = Date.parse(a.updatedAt ?? "");
      const bTime = Date.parse(b.updatedAt ?? "");
      if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) return bTime - aTime;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
    return copy;
  }

  function renderCards() {
    wrap.innerHTML = "";
    const filtered = projects.filter((p) => (activeTag === "All" || (p.tags ?? []).includes(activeTag)) && projectMatchesQuery(p));
    const visible = sortProjects(filtered);

    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "projects__empty";
      empty.textContent = "No projects matched that filter. Try another tag or clear search.";
      wrap.appendChild(empty);
      return;
    }

    for (const p of visible) {
      const el = document.createElement("article");
      el.className = "project";
      el.setAttribute("data-tilt", "");
      if (p.featured) el.dataset.featured = "true";

      const hue = hueForString(p.name ?? "");
      el.style.setProperty("--h1", `${hue}deg`);
      el.style.setProperty("--h2", `${(hue + 70) % 360}deg`);

      const badgeAttr = p.featured ? "" : "hidden";
      el.innerHTML = `
        <div class="project__thumb" aria-hidden="true"></div>
        <div class="project__top">
          <div>
            <div class="project__eyebrow"></div>
            <h3 class="project__title"></h3>
          </div>
          <div class="project__badge" ${badgeAttr}>Featured</div>
        </div>
        <p class="project__desc"></p>
        <ul class="project__highlights" aria-label="Project highlights"></ul>
        <div class="project__meta"></div>
        <div class="project__tags" aria-label="Project tags"></div>
        <div class="project__links" aria-label="Project links"></div>
      `;

      const thumb = $(".project__thumb", el);
      const img = safeUrl(p.imageUrl ?? "", { allowMailto: false });
      if (thumb && img) {
        thumb.style.setProperty("--img", `url("${img}")`);
        thumb.dataset.img = "true";
      }

      $(".project__eyebrow", el).textContent = p.eyebrow ?? "Project";
      $(".project__title", el).textContent = p.name ?? "";
      $(".project__desc", el).textContent = p.description ?? "";

      const highlights = $(".project__highlights", el);
      for (const highlight of p.highlights ?? []) {
        const li = document.createElement("li");
        li.textContent = highlight;
        highlights.appendChild(li);
      }

      const projectDate = formatProjectDate(p.updatedAt);
      const meta = $(".project__meta", el);
      if (projectDate) meta.textContent = `Updated ${projectDate}`;
      else meta.hidden = true;

      const tags = $(".project__tags", el);
      tags.innerHTML = "";
      for (const t of p.tags ?? []) {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = t;
        tags.appendChild(tag);
      }

      const links = $(".project__links", el);
      links.innerHTML = "";
      const code = safeUrl(p.links?.code ?? "", { allowMailto: false });
      const demo = safeUrl(p.links?.demo ?? "", { allowMailto: false });
      if (demo) links.appendChild(linkButton("Live", demo));
      if (code) links.appendChild(linkButton("Code", code));

      const firstLink = demo || code;
      if (firstLink) {
        const copyBtn = document.createElement("button");
        copyBtn.type = "button";
        copyBtn.textContent = "Copy link";
        copyBtn.addEventListener("click", async () => {
          const ok = await copyToClipboard(firstLink);
          showToast(ok ? `Copied link: ${p.name ?? "project"}` : "Couldn’t copy project link");
        });
        links.appendChild(copyBtn);
      }
      wrap.appendChild(el);
    }

    ensureSpotlight();
    initTilt();
    initMagneticUI();
  }

  if (searchInput) {
    const onInput = () => {
      query = searchInput.value.trim().toLowerCase();
      renderCards();
    };
    searchInput.addEventListener("input", onInput);
  }

  bindSortButtons();
  renderFilterButtons();
  renderCards();
}

function setHeadshot() {
  const img = $("#avatarImg");
  if (!img) return;
  const url = safeUrl(content.person.headshotUrl ?? "", { allowMailto: false });
  if (url) img.src = url;
  const name = content.person.name ?? content.person.fullName ?? "";
  if (name) img.alt = `Portrait of ${name}`;
  img.addEventListener("error", () => {
    img.src = "assets/headshot-placeholder.svg";
  }, { once: true });
}

function initQualityCube() {
  const cube = $("#qualityCube");
  const control = $("#cubeControl");
  if (!cube || !control) return;

  let rx = -18;
  let ry = 28;
  let vx = 0;
  let vy = 0.4;
  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;
  let auto = !reduceMotion;
  let visible = true;
  let frameId = 0;

  const render = () => {
    cube.style.setProperty("--rx", `${rx}deg`);
    cube.style.setProperty("--ry", `${ry}deg`);
  };

  render();

  const spin = () => {
    if (reduceMotion) {
      ry += 90;
      render();
      return;
    }
    auto = false;
    vx += 2.4;
    vy += 5.2;
    window.setTimeout(() => {
      auto = true;
    }, 900);
  };

  control.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragging = true;
    moved = false;
    auto = false;
    lastX = e.clientX;
    lastY = e.clientY;
    control.setPointerCapture(e.pointerId);
    cube.classList.add("cube3d--drag");
  });

  control.addEventListener("pointermove", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
    lastX = e.clientX;
    lastY = e.clientY;
    vy += dx * 0.22;
    vx += -dy * 0.22;
  });

  const end = () => {
    dragging = false;
    cube.classList.remove("cube3d--drag");
    window.setTimeout(() => {
      auto = true;
    }, 1300);
  };

  control.addEventListener("pointerup", (e) => {
    e.preventDefault();
    e.stopPropagation();
    end();
  });
  control.addEventListener("pointercancel", (e) => {
    e.preventDefault();
    e.stopPropagation();
    end();
  });

  control.addEventListener("click", () => {
    if (!moved) spin();
    moved = false;
  });

  control.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    spin();
  });

  const tick = () => {
    frameId = 0;
    if (document.hidden || !visible) return;
    if (auto) {
      vy += 0.02;
      vx += 0.004;
    }
    rx = clamp(-54, rx + vx, 54);
    ry = ry + vy;
    vx *= 0.92;
    vy *= 0.92;
    if (Math.abs(vx) < 0.0006) vx = 0;
    if (Math.abs(vy) < 0.0006) vy = 0;
    render();
    frameId = requestAnimationFrame(tick);
  };

  const start = () => {
    if (!frameId && !document.hidden && visible && !reduceMotion) frameId = requestAnimationFrame(tick);
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) start();
      else if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    });
    observer.observe(control);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else {
      start();
    }
  });

  start();
}

function ensureSpotlight() {
  if (!finePointer || reduceMotion) return;
  const targets = $all(
    ".toy, .about-copy, .card, .skill-cat, .principle, .project, .playground__panel, .aside-card, .contact__card, .runner, .pill, .filter, .preset, .mini-run",
  );

  for (const el of targets) {
    if (el.dataset.spotlightReady === "true") continue;
    el.dataset.spotlight = "true";
    el.dataset.spotlightReady = "true";

    el.addEventListener("pointermove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty("--sx", `${x}px`);
      el.style.setProperty("--sy", `${y}px`);
      el.dataset.spotlightOn = "true";
    });

    el.addEventListener("pointerleave", () => {
      el.removeAttribute("data-spotlight-on");
    });
  }
}

function initActiveNav() {
  if (!("IntersectionObserver" in window)) return;

  const links = [...$all(".nav__link"), ...$all(".mobile-menu__link")];
  const linkMap = new Map();

  for (const link of links) {
    const href = link.getAttribute("href") ?? "";
    if (!href.startsWith("#")) continue;
    const id = href.slice(1);
    if (!id) continue;
    const list = linkMap.get(id) ?? [];
    list.push(link);
    linkMap.set(id, list);
  }

  const sections = Array.from(linkMap.keys())
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!sections.length) return;

  function setActive(id) {
    for (const [sid, list] of linkMap.entries()) {
      for (const a of list) {
        if (sid === id) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      }
    }
  }

  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));
      if (!visible.length) return;
      setActive(visible[0].target.id);
    },
    { rootMargin: "-35% 0px -55% 0px", threshold: [0.01, 0.08, 0.18, 0.35] },
  );

  for (const s of sections) io.observe(s);

  const initialId = (location.hash || "").replace("#", "");
  if (initialId && linkMap.has(initialId)) setActive(initialId);
}

function getFocusableElements(root) {
  if (!root) return [];
  const selector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return $all(selector, root).filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    return el.offsetParent !== null || el === document.activeElement;
  });
}

function trapFocusWithin(event, root) {
  if (event.key !== "Tab") return;
  const nodes = getFocusableElements(root);
  if (!nodes.length) {
    event.preventDefault();
    return;
  }
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const current = document.activeElement;
  if (event.shiftKey && current === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && current === last) {
    event.preventDefault();
    first.focus();
  }
}

function setContactAndResume() {
  const email = content.person.email ?? "";
  const mailto = email ? `mailto:${email}` : "";

  const emailLink = $("#emailLink");
  if (emailLink) {
    emailLink.textContent = email || "your@email.com";
    if (mailto) emailLink.href = mailto;
  }

  const contactEmailBtn = $("#contactEmailBtn");
  if (contactEmailBtn) {
    contactEmailBtn.href = mailto || "#";
  }

  const resumeLink = $("#resumeLink");
  const resume = safeUrl(content.person.resumeUrl ?? "");
  if (resumeLink) {
    resumeLink.href = resume || "#";
    resumeLink.classList.toggle("btn--disabled", !resume);
    if (isHttpUrl(resume)) {
      resumeLink.target = "_blank";
      resumeLink.rel = "noopener noreferrer";
    }
    resumeLink.addEventListener("click", (e) => {
      if (!resume) {
        e.preventDefault();
        showToast("Add your resume URL in assets/content.js");
      }
    });
  }

  const copyButtons = [$("#copyEmailBtn"), $("#contactCopyEmail")].filter(Boolean);
  for (const btn of copyButtons) {
    btn.addEventListener("click", async () => {
      const ok = await copyToClipboard(email);
      showToast(ok ? "Email copied" : "Couldn’t copy email");
    });
  }
}

function setRanges() {
  const pairs = [
    ["parallelism", "parallelismVal", (v) => `${v}`],
    ["retries", "retriesVal", (v) => `${v}`],
    ["flake", "flakeVal", (v) => `${v}`],
  ];

  for (const [inputId, outId, fmt] of pairs) {
    const input = $("#" + inputId);
    const out = $("#" + outId);
    if (!input || !out) continue;
    const update = () => {
      out.textContent = fmt(input.value);
    };
    update();
    input.addEventListener("input", update);
  }

  const retries = $("#retries");
  const retriesVal = $("#retriesVal");
  if (retries && retriesVal) {
    const valueWrap = retriesVal.parentElement;
    if (!valueWrap) return;
    const plural = () => {
      const n = Number(retries.value);
      const suffix = n === 1 ? "retry" : "retries";
      valueWrap.replaceChildren(retriesVal, document.createTextNode(` ${suffix}`));
    };
    retries.addEventListener("input", plural);
    plural();
  }
}

const SUITE_PRESETS = {
  fast: {
    parallelism: 12,
    retries: 0,
    flake: 2,
    browsers: ["bChrome"],
    artifacts: ["toggleScreenshots"],
    insight: "Fast: a tiny Chromium smoke path optimized for immediate deploy feedback.",
  },
  balanced: {
    parallelism: 6,
    retries: 1,
    flake: 6,
    browsers: ["bChrome", "bFirefox"],
    artifacts: ["toggleScreenshots", "toggleTrace"],
    insight: "Balanced: broad browser signal with one retry and useful failure evidence.",
  },
  chaos: {
    parallelism: 2,
    retries: 3,
    flake: 24,
    browsers: ["bChrome", "bFirefox", "bWebKit"],
    artifacts: ["toggleScreenshots", "toggleTrace", "toggleVideo"],
    insight: "Chaos: slow workers, high flake, and every artifact—the expensive way to discover weak isolation.",
  },
};

function initSuitePresets() {
  const buttons = $all("[data-suite-preset]");
  const insight = $("#presetInsight");
  if (!buttons.length || !insight) return;
  let applyingPreset = false;

  const rangeIds = ["parallelism", "retries", "flake"];
  const browserIds = ["bChrome", "bFirefox", "bWebKit"];
  const artifactIds = ["toggleScreenshots", "toggleTrace", "toggleVideo"];

  const setActive = (name) => {
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button.dataset.suitePreset === name));
    }
  };

  const applyPreset = (name) => {
    const preset = SUITE_PRESETS[name];
    if (!preset) return;
    applyingPreset = true;

    for (const id of rangeIds) {
      const input = $("#" + id);
      if (!input) continue;
      input.value = String(preset[id]);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    for (const id of browserIds) {
      const input = $("#" + id);
      if (input) input.checked = preset.browsers.includes(id);
    }

    for (const id of artifactIds) {
      const input = $("#" + id);
      if (input) input.checked = preset.artifacts.includes(id);
    }

    setActive(name);
    insight.textContent = preset.insight;
    applyingPreset = false;
  };

  for (const button of buttons) {
    button.addEventListener("click", () => applyPreset(button.dataset.suitePreset ?? "balanced"));
  }

  for (const input of $all(".controls input")) {
    input.addEventListener("input", () => {
      if (applyingPreset) return;
      setActive("");
      insight.textContent = "Custom: your suite, your tradeoffs. Run it to see the release signal.";
    });
  }

  applyPreset("balanced");
}

function computeBrowsers() {
  const list = [];
  if ($("#bChrome")?.checked) list.push("Chromium");
  if ($("#bFirefox")?.checked) list.push("Firefox");
  if ($("#bWebKit")?.checked) list.push("WebKit");
  return list;
}

function setRunnerStatus(text) {
  const el = $("#runnerStatus");
  if (el) el.textContent = text;
}

function setRunnerProgress(pct) {
  const bar = $("#runnerBarFill");
  if (bar) bar.style.width = `${clamp(0, pct, 100)}%`;
}

function setRunnerSummary({ duration, total, passed, failed, flaky }) {
  const wrap = $("#runnerSummary");
  if (!wrap) return;
  wrap.innerHTML = "";

  const isNum = (v) => typeof v === "number" && Number.isFinite(v);
  const durationVal = typeof duration === "string" && duration.trim() ? duration : "—";
  const totalVal = isNum(total) ? String(total) : "—";

  let outcomeVal = "—";
  if (isNum(passed) && isNum(failed)) {
    outcomeVal = failed ? `${passed}✓ ${failed}✗` : `${passed}✓`;
    if (isNum(flaky)) outcomeVal += ` • ${flaky} flaky`;
  }

  const items = [
    { label: "Duration", value: durationVal },
    { label: "Tests", value: totalVal },
    { label: "Outcome", value: outcomeVal },
  ];

  for (const it of items) {
    const el = document.createElement("div");
    el.className = "metric";
    el.innerHTML = `<div class="metric__label"></div><div class="metric__value"></div>`;
    $(".metric__label", el).textContent = it.label;
    $(".metric__value", el).textContent = it.value;
    wrap.appendChild(el);
  }
}

function appendLog(text, tone = "") {
  const log = $("#runnerLog");
  if (!log) return;
  const line = document.createElement("div");
  line.className = `logline${tone ? ` logline--${tone}` : ""}`;
  line.textContent = text;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function clearLog() {
  const log = $("#runnerLog");
  if (log) log.innerHTML = "";
}

function suiteConfig() {
  return {
    parallelism: Number($("#parallelism")?.value ?? 6),
    retries: Number($("#retries")?.value ?? 1),
    flake: Number($("#flake")?.value ?? 6),
    browsers: computeBrowsers(),
    screenshots: $("#toggleScreenshots")?.checked ?? true,
    trace: $("#toggleTrace")?.checked ?? false,
    video: $("#toggleVideo")?.checked ?? false,
  };
}

function formatDuration(ms) {
  const s = Math.round(ms / 100) / 10;
  return `${s.toFixed(1)}s`;
}

function estimateTotals(cfg) {
  const base = 42;
  const perBrowser = 18;
  const total = base + perBrowser * Math.max(1, cfg.browsers.length);
  return total;
}

let suiteRunInFlight = false;

function setSuiteControlState(running) {
  const runBtn = $("#runSuiteBtn");
  if (runBtn) {
    runBtn.toggleAttribute("disabled", running);
    runBtn.classList.toggle("btn--disabled", running);
  }
}

async function runSimulatedSuite() {
  if (suiteRunInFlight) {
    showToast("Suite is already running");
    return;
  }

  const cfg = suiteConfig();
  if (!cfg.browsers.length) {
    showToast("Pick at least one browser");
    return;
  }

  suiteRunInFlight = true;
  setSuiteControlState(true);

  try {
    $("#runnerTitle").textContent = `Pipeline • ${cfg.browsers.join(" / ")}`;
    setRunnerStatus("Starting…");
    setRunnerProgress(0);
    clearLog();
    setRunnerSummary({ duration: "—", total: "—", passed: "—", failed: "—" });

    const startedAt = performance.now();
    const totalTests = estimateTotals(cfg);
    let passed = 0;
    let failed = 0;
    let flaky = 0;

    const steps = [
      { name: "Install", weight: 12 },
      { name: "Lint", weight: 8 },
      { name: "Unit tests", weight: 16 },
      { name: "API tests", weight: 18 },
      { name: `UI tests (${cfg.browsers.length} browsers)`, weight: 46 },
    ];
    const totalWeight = steps.reduce((sum, s) => sum + s.weight, 0);
    const workerFactor = clamp(0.48, 1.38 - (cfg.parallelism - 1) * 0.075, 1.38);
    const artifactFactor = 1 + Number(cfg.trace) * 0.08 + Number(cfg.video) * 0.14;

    appendLog(`[ci] config: ${cfg.parallelism} workers • retries=${cfg.retries} • flake=${cfg.flake}%`);
    appendLog(
      `[ci] artifacts: screenshots=${cfg.screenshots ? "on" : "off"} • trace=${cfg.trace ? "on" : "off"} • video=${
        cfg.video ? "on" : "off"
      }`,
    );
    appendLog(`[ci] execution model: ${cfg.parallelism} isolated workers • speed factor=${workerFactor.toFixed(2)}x`);

    let accum = 0;

    for (const step of steps) {
      setRunnerStatus(step.name);
      appendLog(`[ci] ▶ ${step.name}…`);

      const browserFactor = step.name.startsWith("UI tests") ? 0.85 + cfg.browsers.length * 0.16 : 1;
      const stepMs = reduceMotion ? 80 : (300 + Math.random() * 800) * workerFactor * artifactFactor * browserFactor;
      const ticks = reduceMotion ? 1 : 12;
      for (let i = 0; i < ticks; i++) {
        await sleep(stepMs / ticks);
        const local = (i + 1) / ticks;
        const pct = ((accum + step.weight * local) / totalWeight) * 100;
        setRunnerProgress(pct);
      }

      accum += step.weight;
      appendLog(`[ci] ✓ ${step.name} done`, "good");
    }

    // Simulated results.
    const rawFlakes = Math.round((totalTests * cfg.flake) / 100);
    flaky = rawFlakes;
    const effectiveFailures = Math.max(0, Math.round(rawFlakes * (1 - clamp(0, cfg.retries, 3) * 0.28)));
    failed = effectiveFailures;
    passed = totalTests - failed;

    if (failed) {
      appendLog(`[suite] ${passed} passed • ${failed} failed • ${flaky} flaky`, "bad");
    } else {
      appendLog(`[suite] ${passed} passed • ${failed} failed • ${flaky} flaky`, "good");
    }

    if (failed && cfg.screenshots) appendLog(`[artifact] screenshots: attached`, "good");
    if (failed && cfg.trace) appendLog(`[artifact] trace.zip: attached`, "good");
    if (failed && cfg.video) appendLog(`[artifact] run.mp4: attached`, "good");

    const duration = performance.now() - startedAt;
    setRunnerStatus(failed ? "Failed" : "Passed");
    setRunnerProgress(100);
    setRunnerSummary({ duration: formatDuration(duration), total: totalTests, passed, failed, flaky });

    if (!failed) {
      showToast("Green build");
      burstConfetti({ count: 46 });
    }
  } catch (error) {
    console.error(error);
    setRunnerStatus("Error");
    appendLog("[ci] unexpected error, please retry", "bad");
    showToast("Suite run failed");
  } finally {
    suiteRunInFlight = false;
    setSuiteControlState(false);
  }
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("theme", theme);
  } catch {}
  const icon = $("#themeToggleIcon");
  if (icon) icon.textContent = theme === "light" ? "◑" : "◐";
  const button = $("#themeToggle");
  if (button) {
    const isDark = theme === "dark";
    button.setAttribute("aria-pressed", String(isDark));
    button.title = isDark ? "Use light theme" : "Use dark theme";
    const label = $(".sr-only", button);
    if (label) label.textContent = button.title;
  }
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  setTheme(current === "light" ? "dark" : "light");
}

function initTheme() {
  const current = document.documentElement.dataset.theme;
  if (current === "light" || current === "dark") {
    setTheme(current);
    return;
  }
  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)")?.matches ?? false;
  setTheme(prefersLight ? "light" : "dark");
}

function initReveal() {
  const els = $all(".reveal");
  if (!("IntersectionObserver" in window)) {
    for (const el of els) el.dataset.in = "true";
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.dataset.in = "true";
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12 },
  );
  for (const el of els) io.observe(el);
}

function initScrollProgress() {
  const bar = $("#scrollProgressBar");
  if (!bar) return;
  const onScroll = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const pct = max > 0 ? (doc.scrollTop / max) * 100 : 0;
    bar.style.width = `${pct}%`;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function initBackToTop() {
  $("#backToTop")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });
}

function initTilt() {
  if (reduceMotion || !finePointer) return;
  const els = $all("[data-tilt]");
  for (const el of els) {
    if (el.dataset.tiltReady === "true") continue;
    el.dataset.tiltReady = "true";
    el.addEventListener("pointermove", (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rx = (0.5 - py) * 8;
      const ry = (px - 0.5) * 10;
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transform = "";
    });
  }
}

function initMagneticUI() {
  if (reduceMotion || !finePointer) return;
  const els = $all(".btn, .mini-run, .pill, .filter, .icon-btn");
  for (const el of els) {
    if (el.dataset.magnetReady === "true") continue;
    el.dataset.magnetReady = "true";
    el.addEventListener("pointermove", (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      const tx = px * 8;
      const ty = py * 8;
      el.style.transform = `translate(${tx}px, ${ty}px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transform = "";
    });
  }
}

function initHeroCanvas() {
  const canvas = $("#heroCanvas");
  if (!canvas) return;
  if (reduceMotion) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w = 0;
  let h = 0;
  let visible = true;
  let frameId = 0;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const particles = [];
  const count = 42;

  function resize() {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seed() {
    particles.length = 0;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: 1.6 + Math.random() * 1.8,
      });
    }
  }

  function draw() {
    frameId = 0;
    if (document.hidden || !visible) return;
    ctx.clearRect(0, 0, w, h);

    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;

      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 18);
      g.addColorStop(0, "rgba(255,95,69,0.22)");
      g.addColorStop(1, "rgba(0,180,216,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
    frameId = requestAnimationFrame(draw);
  }

  const start = () => {
    if (!frameId && !document.hidden && visible) frameId = requestAnimationFrame(draw);
  };

  const onResize = () => {
    resize();
    seed();
  };
  window.addEventListener("resize", onResize, { passive: true });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) start();
      else if (frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    });
    observer.observe(canvas);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else {
      start();
    }
  });
  onResize();
  start();
}

function showRandomQaTip() {
  const tip = pickRandom(content.qaTips ?? []);
  if (!tip) return;
  const trimmed = tip.length > 120 ? `${tip.slice(0, 117)}...` : tip;
  showToast(`QA tip: ${trimmed}`);
}

function initQaTipAction() {
  $("#miniQaTip")?.addEventListener("click", () => {
    showRandomQaTip();
  });
}

const GITHUB_PULSE_TTL_MS = 6 * 60 * 60 * 1000;

async function fetchGitHubPulseData(username, { force = false } = {}) {
  const cacheKey = `github-pulse:${username}`;

  if (!force) {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Date.now() - toNumber(cached.cachedAt, 0) < GITHUB_PULSE_TTL_MS) {
          return cached.payload ?? null;
        }
      }
    } catch {}
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 5500);

  try {
    const headers = { Accept: "application/vnd.github+json" };
    const userUrl = `https://api.github.com/users/${encodeURIComponent(username)}`;
    const reposUrl = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=pushed&per_page=20&type=owner`;

    const [userRes, reposRes] = await Promise.all([
      fetch(userUrl, { headers, signal: controller.signal }),
      fetch(reposUrl, { headers, signal: controller.signal }),
    ]);

    if (!userRes.ok || !reposRes.ok) {
      throw new Error("GitHub API request failed");
    }

    const user = await userRes.json();
    const repos = await reposRes.json();
    const latest = (repos ?? []).find((repo) => !repo.fork) ?? repos?.[0];
    const top = [...(repos ?? [])].sort((a, b) => toNumber(b.stargazers_count, 0) - toNumber(a.stargazers_count, 0))[0] ?? latest;

    const payload = {
      repos: toNumber(user?.public_repos, 0),
      followers: toNumber(user?.followers, 0),
      latestName: latest?.name ?? "",
      latestPushedAt: latest?.pushed_at ?? "",
      topName: top?.name ?? "",
      topStars: toNumber(top?.stargazers_count, 0),
    };

    try {
      localStorage.setItem(cacheKey, JSON.stringify({ cachedAt: Date.now(), payload }));
    } catch {}

    return payload;
  } finally {
    window.clearTimeout(timer);
  }
}

function renderGitHubPulseText(data) {
  if (!data) return "GitHub stats unavailable right now.";
  const latestAge = relativeTimeFromNow(data.latestPushedAt);
  const latestText = data.latestName ? `latest ${data.latestName}${latestAge ? ` (${latestAge})` : ""}` : "latest activity unavailable";
  const topText = data.topName ? `top ${data.topName}${data.topStars ? ` (${formatCompactNumber(data.topStars)} stars)` : ""}` : "";
  return `${formatCompactNumber(data.repos)} repos • ${formatCompactNumber(data.followers)} followers • ${latestText}${topText ? ` • ${topText}` : ""}`;
}

async function initGitHubPulse({ force = false, notify = false } = {}) {
  const output = $("#githubPulseValue");
  if (!output) return;
  const username = getGithubUsername();
  if (!username) {
    output.textContent = "Add a GitHub profile link to enable live stats.";
    return;
  }

  output.textContent = force ? "Refreshing stats..." : "Loading stats...";
  try {
    const data = await fetchGitHubPulseData(username, { force });
    output.textContent = renderGitHubPulseText(data);
    if (notify && force) showToast("GitHub pulse refreshed");
  } catch {
    output.textContent = "GitHub stats unavailable right now.";
    if (notify && force) showToast("Couldn’t refresh GitHub pulse");
  }
}

function initFlakeCostEstimator() {
  const runsInput = $("#costRunsPerDay");
  const flakeInput = $("#costFlakeRate");
  const rerunInput = $("#costRerunMinutes");
  const suiteInput = $("#costSuiteMinutes");
  const output = $("#flakeCostResult");
  if (!runsInput || !flakeInput || !rerunInput || !suiteInput || !output) return;

  const update = () => {
    const runsPerDay = clamp(1, toNumber(runsInput.value, 24), 300);
    const flakeRate = clamp(0, toNumber(flakeInput.value, 6), 100);
    const rerunMinutes = clamp(1, toNumber(rerunInput.value, 7), 120);
    const suiteMinutes = clamp(1, toNumber(suiteInput.value, 18), 180);

    const flakyRerunsPerDay = runsPerDay * (flakeRate / 100);
    const lostMinutesPerDay = flakyRerunsPerDay * rerunMinutes;
    const lostHoursPerMonth = (lostMinutesPerDay * 22) / 60;
    const lostWorkdaysPerYear = (lostMinutesPerDay * 260) / (60 * 8);
    const wasteRatio = (lostMinutesPerDay / (runsPerDay * suiteMinutes)) * 100;

    output.innerHTML =
      `<strong>${Math.round(lostMinutesPerDay)} min/day</strong> lost to flaky reruns.` +
      `<br />About <strong>${lostHoursPerMonth.toFixed(1)} hours/month</strong> and <strong>${lostWorkdaysPerYear.toFixed(1)} workdays/year</strong>.` +
      `<br /><strong>${wasteRatio.toFixed(1)}%</strong> of CI time gets burned on reruns.`;
  };

  for (const input of [runsInput, flakeInput, rerunInput, suiteInput]) {
    input.addEventListener("input", update);
    input.addEventListener("change", update);
  }

  update();
}

function initCmdPalette() {
  const palette = $("#palette");
  const input = $("#paletteInput");
  const list = $("#paletteList");
  const btn = $("#cmdkBtn");
  if (!palette || !input || !list || !btn) return;
  const dialog = $("#paletteDialog") ?? $(".palette__dialog", palette);
  if (!dialog) return;

  const commands = [
    { label: "Go to: Selected Work", hint: "Scroll", kbd: "GO", run: () => location.hash = "#projects" },
    { label: "Go to: About", hint: "Scroll", kbd: "GO", run: () => location.hash = "#about" },
    { label: "Go to: Skills", hint: "Scroll", kbd: "GO", run: () => location.hash = "#skills" },
    { label: "Go to: Approach", hint: "Scroll", kbd: "GO", run: () => location.hash = "#approach" },
    { label: "Go to: QA Lab", hint: "Scroll", kbd: "GO", run: () => location.hash = "#playground" },
    { label: "Go to: Contact", hint: "Scroll", kbd: "GO", run: () => location.hash = "#contact" },
    { label: "Toggle theme", hint: "Light/Dark", kbd: "DO", run: () => toggleTheme() },
    {
      label: "Copy email",
      hint: content.person.email,
      kbd: "DO",
      run: async () => {
        const ok = await copyToClipboard(content.person.email ?? "");
        showToast(ok ? "Email copied" : "Couldn’t copy email");
      },
    },
    { label: "QA tip", hint: "Random quality advice", kbd: "DO", run: () => showRandomQaTip() },
    { label: "Run suite", hint: "QA Lab simulator", kbd: "DO", run: () => runSimulatedSuite() },
    {
      label: "Refresh GitHub pulse",
      hint: "Fetch latest public stats",
      kbd: "DO",
      run: () => initGitHubPulse({ force: true, notify: true }),
    },
    { label: "Celebrate", hint: "Confetti burst", kbd: "DO", run: () => burstConfetti({ count: 70 }) },
  ];

  for (const link of content.person.links ?? []) {
    const href = safeUrl(link.url);
    if (!href || href.startsWith("mailto:")) continue;
    commands.push({
      label: `Open: ${link.label}`,
      hint: href,
      kbd: "↗",
      run: () => window.open(href, "_blank", "noopener,noreferrer"),
    });
  }

  let open = false;
  let filtered = [];
  let activeIndex = 0;
  let returnFocusTo = null;

  function setOpen(next) {
    if (open === next) return;
    open = next;
    palette.dataset.open = String(open);
    palette.setAttribute("aria-hidden", String(!open));
    palette.toggleAttribute("inert", !open);
    btn.setAttribute("aria-expanded", String(open));
    input.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("no-scroll", open);
    if (open) {
      returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : btn;
      input.value = "";
      filtered = commands.slice();
      activeIndex = 0;
      renderList();
      input.focus();
    } else {
      input.blur();
      input.setAttribute("aria-activedescendant", "");
      const target = returnFocusTo instanceof HTMLElement ? returnFocusTo : btn;
      target.focus?.();
    }
  }

  function renderList() {
    list.innerHTML = "";
    const items = filtered.length ? filtered : [{ label: "No results", hint: "", kbd: "" }];
    items.forEach((cmd, idx) => {
      const el = document.createElement("div");
      el.className = "cmd";
      el.id = `paletteOption-${idx}`;
      el.role = "option";
      el.setAttribute("aria-selected", String(idx === activeIndex));
      el.innerHTML = `
        <div>
          <div class="cmd__label"></div>
          <div class="cmd__hint"></div>
        </div>
        <div class="cmd__kbd"></div>
      `;
      $(".cmd__label", el).textContent = cmd.label ?? "";
      $(".cmd__hint", el).textContent = cmd.hint ?? "";
      $(".cmd__kbd", el).textContent = cmd.kbd ?? "";
      el.addEventListener("click", () => runActive(idx));
      list.appendChild(el);
    });
    input.setAttribute("aria-activedescendant", items.length ? `paletteOption-${activeIndex}` : "");
  }

  function filter() {
    const q = input.value.trim().toLowerCase();
    filtered = q
      ? commands.filter((c) => (c.label ?? "").toLowerCase().includes(q) || (c.hint ?? "").toLowerCase().includes(q))
      : commands.slice();
    activeIndex = 0;
    renderList();
  }

  function runActive(forceIndex) {
    const idx = typeof forceIndex === "number" ? forceIndex : activeIndex;
    const cmd = filtered[idx];
    if (cmd?.run) cmd.run();
    setOpen(false);
  }

  function move(delta) {
    activeIndex = clamp(0, activeIndex + delta, Math.max(0, filtered.length - 1));
    renderList();
    const activeEl = list.children[activeIndex];
    activeEl?.scrollIntoView({ block: "nearest" });
  }

  input.addEventListener("input", filter);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      runActive();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  });

  btn.addEventListener("click", () => setOpen(true));

  for (const closeEl of $all("[data-close]", palette)) {
    closeEl.addEventListener("click", () => setOpen(false));
  }

  window.addEventListener("keydown", (e) => {
    const isK = e.key.toLowerCase() === "k";
    const mod = e.ctrlKey || e.metaKey;
    if (mod && isK) {
      e.preventDefault();
      setOpen(!open);
    } else if (open && e.key === "Escape") {
      setOpen(false);
    } else if (open && e.key === "Tab") {
      trapFocusWithin(e, dialog);
    }
  });
}

function initMiniRun() {
  $("#miniRunSuite")?.addEventListener("click", async () => {
    location.hash = "#playground";
    await sleep(reduceMotion ? 0 : 220);
    runSimulatedSuite();
  });
}

function initThemeToggle() {
  $("#themeToggle")?.addEventListener("click", () => toggleTheme());
}

function initKonami() {
  const seq = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  let i = 0;
  window.addEventListener("keydown", (e) => {
    const key = (e.key ?? "").toLowerCase();
    if (!key) return;
    if (key === seq[i]) {
      i += 1;
      if (i >= seq.length) {
        i = 0;
        showToast("Konami ✓");
        burstConfetti({ count: 90 });
      }
    } else {
      i = 0;
    }
  });
}

function initRunSuite() {
  $("#runSuiteBtn")?.addEventListener("click", () => runSimulatedSuite());
}

function initMobileMenu() {
  const menu = $("#mobileMenu");
  const btn = $("#menuBtn");
  if (!menu || !btn) return;
  const panel = $("#mobileMenuDialog") ?? $(".mobile-menu__panel", menu);
  if (!panel) return;

  let open = false;
  let returnFocusTo = null;

  function setOpen(next) {
    if (open === next) return;
    open = next;
    menu.dataset.open = String(open);
    menu.setAttribute("aria-hidden", String(!open));
    menu.toggleAttribute("inert", !open);
    btn.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("no-scroll", open);
    if (open) {
      returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : btn;
      const first = $(".mobile-menu__link", menu) ?? $("[data-close]", menu);
      window.setTimeout(() => first?.focus?.(), 0);
    } else {
      const target = returnFocusTo instanceof HTMLElement ? returnFocusTo : btn;
      target.focus?.();
    }
  }

  btn.addEventListener("click", () => setOpen(true));

  for (const el of $all("[data-close]", menu)) {
    el.addEventListener("click", () => setOpen(false));
  }

  window.addEventListener("keydown", (e) => {
    if (open && e.key === "Escape") setOpen(false);
    if (open && e.key === "Tab") trapFocusWithin(e, panel);
  });
}

function initEmailLink() {
  const email = content.person.email ?? "";
  const mailto = email ? `mailto:${email}` : "";
  $("#contactEmailBtn")?.setAttribute("href", mailto || "#");
}

function init() {
  initTheme();
  setBindText();
  setFooterYear();
  initLaClock();
  setHeadshot();

  renderImpactStats();
  renderSocialLinks();
  renderContactLinks();
  renderAbout();
  renderSkills();
  renderPrinciples();
  renderProjects();

  ensureSpotlight();

  setContactAndResume();
  setRanges();
  initSuitePresets();

  initActiveNav();
  initScrollProgress();
  initReveal();
  initBackToTop();
  initTilt();
  initMagneticUI();
  initHeroCanvas();
  initQualityCube();

  initThemeToggle();
  initMobileMenu();
  initCmdPalette();
  initMiniRun();
  initQaTipAction();
  initGitHubPulse();
  initFlakeCostEstimator();
  initKonami();
  initRunSuite();
  initEmailLink();
  document.documentElement.classList.add("app-ready");
}

init();
