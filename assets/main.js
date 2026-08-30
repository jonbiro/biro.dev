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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeUrl(url, { allowMailto = true } = {}) {
  if (!url || typeof url !== "string") return "";
  const raw = url.trim();
  if (!raw || /[\u0000-\u001f\u007f]/.test(raw)) return "";
  if (raw.startsWith("//") || raw.startsWith("\\\\")) return "";

  if (raw.startsWith("#")) return raw;

  if (raw.startsWith("/") || raw.startsWith("./") || raw.startsWith("../")) {
    try {
      const parsed = new URL(raw, window.location.href);
      if (parsed.origin !== window.location.origin) return "";
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return "";
    }
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

function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";
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
  let intervalId = 0;
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
  const start = () => {
    if (intervalId || document.hidden) return;
    update();
    intervalId = window.setInterval(update, 30_000);
  };
  const stop = () => {
    if (!intervalId) return;
    window.clearInterval(intervalId);
    intervalId = 0;
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });
  update();
  start();
}

function buildFilters(projects) {
  const categories = ["Automation", "Apps", "Play"];
  return [
    { value: "All", label: `All · ${projects.length}` },
    ...categories
      .map((category) => ({
        value: category,
        label: `${category} · ${projects.filter((project) => project.category === category).length}`,
      }))
      .filter((filter) => !filter.label.endsWith("· 0")),
  ];
}

function renderProjects() {
  const projects = content.projects ?? [];
  const wrap = $("#projectsGrid");
  const filtersWrap = $("#projectFilters");
  const searchInput = $("#projectSearch");
  const sortWrap = $("#projectSorts");
  const status = $("#projectResultsStatus");
  if (!wrap || !filtersWrap) return;

  let activeTag = "All";
  let activeSort = "featured";
  let query = "";
  const filters = buildFilters(projects);
  const orderBySource = new Map(projects.map((project, index) => [project, index]));
  const cardByProject = new Map(
    projects
      .map((project) => [project, $(`#project-${slugify(project.slug ?? project.name)}`, wrap)])
      .filter((entry) => entry[1] instanceof HTMLElement),
  );

  function renderFilterButtons({ focusValue = "" } = {}) {
    filtersWrap.innerHTML = "";
    for (const filter of filters) {
      const btn = document.createElement("button");
      btn.className = "filter";
      btn.type = "button";
      btn.setAttribute("aria-pressed", String(filter.value === activeTag));
      btn.textContent = filter.label;
      btn.addEventListener("click", () => {
        activeTag = filter.value;
        renderFilterButtons({ focusValue: filter.value });
        renderCards();
      });
      filtersWrap.appendChild(btn);
      if (focusValue === filter.value) window.queueMicrotask(() => btn.focus());
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
      return (orderBySource.get(a) ?? 0) - (orderBySource.get(b) ?? 0);
    });
    return copy;
  }

  function renderCards() {
    const filtered = projects.filter((p) => (activeTag === "All" || p.category === activeTag) && projectMatchesQuery(p));
    const visible = sortProjects(filtered).filter((project) => cardByProject.has(project));
    if (status) {
      status.textContent = visible.length
        ? `Showing ${visible.length} of ${projects.length} ${projects.length === 1 ? "project" : "projects"}`
        : "No projects found";
    }

    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "projects__empty";
      empty.textContent = "No projects matched that filter. Try another tag or clear search.";
      wrap.replaceChildren(empty);
      return;
    }

    const cards = [];
    for (const project of visible) {
      const card = cardByProject.get(project);
      card.removeAttribute("data-spotlight-project");
      cards.push(card);
    }
    const flagship = visible.find((project) => project.featured);
    if (flagship && activeSort === "featured" && activeTag === "All" && !query && visible.length > 1) {
      cardByProject.get(flagship)?.setAttribute("data-spotlight-project", "true");
    }
    wrap.replaceChildren(...cards);

    ensureSpotlight();
  }

  for (const [project, card] of cardByProject) {
    if (!project.caseStudy) continue;
    const reportBtn = $(".project__report", card);
    if (!reportBtn || reportBtn.dataset.reportReady === "true") continue;
    reportBtn.dataset.reportReady = "true";
    reportBtn.addEventListener("click", () => openProjectReport(project, reportBtn));
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
  const flagship = projects.find((project) => project.featured);
  cardByProject.get(flagship)?.setAttribute("data-spotlight-project", "true");

  for (const proofLink of $all('a[href="#project-super-seerr"]')) {
    proofLink.addEventListener("click", () => {
      activeTag = "All";
      activeSort = "featured";
      query = "";
      if (searchInput) searchInput.value = "";
      renderFilterButtons();
      renderSortButtons();
      renderCards();
    });
  }
}

function openProjectReport(project, returnFocusTo = null) {
  if (!project?.caseStudy) return;
  window.dispatchEvent(new CustomEvent("portfolio:open-report", { detail: { project, returnFocusTo } }));
}

function fillTextList(root, items) {
  if (!root) return;
  root.innerHTML = "";
  for (const text of items ?? []) {
    const item = document.createElement("li");
    item.textContent = text;
    root.appendChild(item);
  }
}

function createSheetController({ root, dialog, closeSelector, name, opener, onOpen }) {
  if (!root || !dialog) return null;
  let open = false;
  let returnFocusTo = null;

  const setOpen = (next, detail = null) => {
    const payload = detail?.project ?? detail;
    if (next && typeof onOpen === "function") onOpen(payload);
    if (open === next) return;
    open = next;
    root.dataset.open = String(open);
    root.setAttribute("aria-hidden", String(!open));
    root.toggleAttribute("inert", !open);
    if (open) {
      returnFocusTo = detail?.returnFocusTo instanceof HTMLElement
        ? detail.returnFocusTo
        : document.activeElement instanceof HTMLElement
          ? document.activeElement
          : opener;
      window.dispatchEvent(new CustomEvent("portfolio:modal-open", { detail: name }));
      window.setTimeout(() => (getFocusableElements(dialog)[0] ?? dialog).focus(), 0);
    } else {
      const target = returnFocusTo instanceof HTMLElement ? returnFocusTo : opener;
      target?.focus?.();
    }
    syncBodyScrollLock();
  };

  for (const close of $all(closeSelector, root)) close.addEventListener("click", () => setOpen(false));

  window.addEventListener("portfolio:modal-open", (event) => {
    if (event.detail !== name && open) setOpen(false);
  });
  window.addEventListener("keydown", (event) => {
    if (!open) return;
    if (event.key === "Escape") setOpen(false);
    if (event.key === "Tab") trapFocusWithin(event, dialog);
  });

  return { setOpen, get isOpen() { return open; } };
}

function populateProjectReport(project) {
  const report = project?.caseStudy;
  if (!report) return;
  $("#reportLabel").textContent = report.label ?? "Test report";
  $("#reportTitle").textContent = project.name ?? "Project report";
  $("#reportSummary").textContent = project.description ?? "";
  $("#reportContext").textContent = report.context ?? "";
  $("#reportDecision").textContent = report.decision ?? "";
  fillTextList($("#reportRisks"), report.risks);
  fillTextList($("#reportStrategy"), report.strategy);

  const gallery = $("#reportGallery");
  if (gallery) {
    gallery.innerHTML = "";
    const images = project.gallery?.length
      ? project.gallery
      : project.imageUrl
        ? [{ src: project.imageUrl, alt: `${project.name ?? "Project"} preview` }]
        : [];
    gallery.hidden = !images.length;
    for (const image of images) {
      const src = safeUrl(image.src ?? "", { allowMailto: false });
      if (!src) continue;
      const figure = document.createElement("figure");
      const img = document.createElement("img");
      img.src = src;
      img.alt = image.alt ?? "";
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("error", () => {
        figure.remove();
        if (!gallery.children.length) gallery.hidden = true;
      }, { once: true });
      figure.appendChild(img);
      gallery.appendChild(figure);
    }
  }

  const evidence = $("#reportEvidence");
  if (evidence) {
    evidence.innerHTML = "";
    for (const proof of report.evidence ?? []) {
      const href = safeUrl(proof.href ?? "", { allowMailto: false });
      const item = document.createElement(href ? "a" : "div");
      item.className = `report-proof${href ? " report-proof--link" : ""}`;
      if (href) {
        item.href = href;
        if (isHttpUrl(href)) {
          item.target = "_blank";
          item.rel = "noopener noreferrer";
        }
      }
      item.innerHTML = `<strong></strong><span></span>`;
      $("strong", item).textContent = proof.value ?? "";
      $("span", item).textContent = proof.label ?? "";
      evidence.appendChild(item);
    }
  }

  const setOptionalCopy = (blockSelector, copySelector, value) => {
    const block = $(blockSelector);
    const copy = $(copySelector);
    if (!block || !copy) return;
    const text = typeof value === "string" ? value.trim() : "";
    block.hidden = !text;
    copy.textContent = text;
  };

  setOptionalCopy("#reportOwnership", "#reportOwned", report.owned);
  setOptionalCopy("#reportTradeoffBlock", "#reportTradeoff", report.tradeoff);
  setOptionalCopy("#reportNextBlock", "#reportNext", report.next);

  const verification = report.verification;
  const verificationBlock = $("#reportVerification");
  if (verificationBlock) {
    verificationBlock.hidden = !verification;
    if (verification) {
      $("#reportVerificationLabel").textContent = verification.label ?? "Verified snapshot";
      $("#reportVerificationStatus").textContent = verification.status ?? "";
      $("#reportVerificationCommand").textContent = verification.command ?? "";
      $("#reportVerificationDate").textContent = verification.checkedOn ?? "";

      const commit = $("#reportVerificationCommit");
      const commitUrl = safeUrl(verification.commitUrl ?? "", { allowMailto: false });
      if (commit) {
        commit.textContent = verification.commit ? `Commit ${verification.commit} ↗` : "";
        if (commitUrl) {
          commit.href = commitUrl;
          commit.hidden = false;
        } else {
          commit.removeAttribute("href");
          commit.hidden = true;
        }
      }
      fillTextList($("#reportVerificationDetails"), verification.details);
    }
  }

  const architectureBlock = $("#reportArchitecture");
  const architectureSteps = $("#reportArchitectureSteps");
  const architecture = Array.isArray(report.architecture) ? report.architecture : [];
  if (architectureBlock && architectureSteps) {
    architectureBlock.hidden = !architecture.length;
    architectureSteps.innerHTML = "";
    for (const [index, step] of architecture.entries()) {
      const details = document.createElement("details");
      details.className = "architecture-step";
      details.open = index === 0;
      const summary = document.createElement("summary");
      const number = document.createElement("span");
      number.className = "architecture-step__number";
      number.textContent = step.step ?? String(index + 1).padStart(2, "0");
      const title = document.createElement("strong");
      title.textContent = step.title ?? "System layer";
      const path = document.createElement("code");
      path.textContent = step.path ?? "";
      summary.append(number, title, path);
      const copy = document.createElement("p");
      copy.textContent = step.text ?? "";
      details.append(summary, copy);
      architectureSteps.appendChild(details);
    }
  }

  const actions = $("#reportActions");
  if (actions) {
    actions.innerHTML = "";
    const demo = safeUrl(project.links?.demo ?? "", { allowMailto: false });
    const code = safeUrl(project.links?.code ?? "", { allowMailto: false });
    if (code) {
      const link = document.createElement("a");
      link.className = "btn btn--primary";
      link.href = code;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Inspect source";
      actions.appendChild(link);
    }
    if (demo) {
      const link = document.createElement("a");
      link.className = "btn btn--ghost";
      link.href = demo;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open live build";
      actions.appendChild(link);
    }
  }
}

function initProjectReport() {
  const root = $("#projectReport");
  const dialog = $("#projectReportDialog");
  const controller = createSheetController({
    root,
    dialog,
    closeSelector: "[data-close-report]",
    name: "project-report",
    onOpen: populateProjectReport,
  });
  if (!controller) return;
  window.addEventListener("portfolio:open-report", (event) => controller.setOpen(true, event.detail));
}

function initBrief() {
  const root = $("#brief");
  const dialog = $("#briefDialog");
  const opener = $("#briefBtn");
  const controller = createSheetController({
    root,
    dialog,
    closeSelector: "[data-close-brief]",
    name: "brief",
    opener,
  });
  if (!controller || !opener) return;
  opener.addEventListener("click", () => controller.setOpen(true));
  window.addEventListener("portfolio:open-brief", () => controller.setOpen(true));
  $("#briefWorkBtn")?.addEventListener("click", () => {
    const strongest = content.projects?.[0];
    if (strongest?.caseStudy) {
      controller.setOpen(false);
      openProjectReport(strongest, opener);
    }
    else {
      controller.setOpen(false);
      location.hash = "#projects";
    }
  });
}

function initQaChallenge() {
  const challenges = content.qaChallenges ?? [];
  const question = $("#challengeQuestion");
  const choices = $("#challengeChoices");
  const feedback = $("#challengeFeedback");
  const index = $("#challengeIndex");
  const next = $("#challengeNext");
  if (!challenges.length || !question || !choices || !feedback || !index || !next) return;
  let active = 0;

  const render = () => {
    const challenge = challenges[active];
    question.textContent = challenge.question ?? "";
    index.textContent = `${active + 1} / ${challenges.length}`;
    choices.innerHTML = "";
    feedback.textContent = "";
    feedback.removeAttribute("data-tone");
    next.hidden = true;
    for (const [choiceIndex, label] of (challenge.choices ?? []).entries()) {
      const button = document.createElement("button");
      button.className = "qa-choice";
      button.type = "button";
      button.textContent = label;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-describedby", "challengeFeedback");
      button.addEventListener("click", () => {
        const correct = choiceIndex === challenge.answer;
        for (const choiceButton of $all(".qa-choice", choices)) {
          choiceButton.disabled = true;
          choiceButton.setAttribute("aria-pressed", String(choiceButton === button));
        }
        button.dataset.result = correct ? "correct" : "incorrect";
        const correctButton = choices.children[challenge.answer];
        if (correctButton instanceof HTMLElement) correctButton.dataset.result = "correct";
        feedback.dataset.tone = correct ? "good" : "bad";
        feedback.textContent = `${correct ? "Strong call." : "Not quite."} ${challenge.rationale ?? ""}`;
        next.hidden = false;
        next.textContent = active === challenges.length - 1 ? "Start over" : "Next challenge";
        next.focus();
      });
      choices.appendChild(button);
    }
  };

  next.addEventListener("click", () => {
    active = (active + 1) % challenges.length;
    render();
    $(".qa-choice", choices)?.focus();
  });
  render();
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
  let visible = !("IntersectionObserver" in window);
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

  if (!("IntersectionObserver" in window)) start();
}

let spotlightInitialized = false;

function ensureSpotlight() {
  if (!finePointer || reduceMotion || spotlightInitialized) return;
  spotlightInitialized = true;
  const selector =
    ".toy, .about-copy, .card, .skill-cat, .principle, .project, .playground__panel, .aside-card, .contact__card, .runner, .pill, .filter, .preset, .stat--link";
  let active = null;

  const clearActive = () => {
    active?.removeAttribute("data-spotlight-on");
    active = null;
  };

  document.addEventListener(
    "pointermove",
    (event) => {
      const target = event.target instanceof Element ? event.target.closest(selector) : null;
      if (!target) {
        clearActive();
        return;
      }
      if (active && active !== target) clearActive();
      active = target;
      const rect = target.getBoundingClientRect();
      target.dataset.spotlight = "true";
      target.dataset.spotlightOn = "true";
      target.style.setProperty("--sx", `${event.clientX - rect.left}px`);
      target.style.setProperty("--sy", `${event.clientY - rect.top}px`);
    },
    { passive: true },
  );
  document.addEventListener(
    "pointerout",
    (event) => {
      if (!active) return;
      const related = event.relatedTarget;
      if (!(related instanceof Node) || !active.contains(related)) clearActive();
    },
    { passive: true },
  );
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
        if (sid === id) a.setAttribute("aria-current", "location");
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
  if (!(current instanceof Node) || !root.contains(current) || current === root) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && current === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && current === last) {
    event.preventDefault();
    first.focus();
  }
}

function syncBodyScrollLock() {
  const modalOpen = Boolean($(".mobile-menu[data-open='true'], .palette[data-open='true'], .sheet[data-open='true']"));
  document.body.classList.toggle("no-scroll", modalOpen);
}

function setButtonLabel(button, label) {
  if (!button) return;
  const text = $(".sr-only", button);
  if (text) text.textContent = label;
}

function initSkipLink() {
  const link = $(".skip-link");
  const main = $("#main-content");
  if (!link || !main) return;
  link.addEventListener("click", () => {
    window.setTimeout(() => main.focus({ preventScroll: true }), 0);
  });
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
    ["parallelism", "parallelismVal", (v) => `${v}`, (v) => `${v} workers`],
    ["retries", "retriesVal", (v) => `${v}`, (v) => `${v} ${Number(v) === 1 ? "retry" : "retries"}`],
    ["flake", "flakeVal", (v) => `${v}`, (v) => `${v} percent flake rate`],
  ];

  for (const [inputId, outId, fmt, ariaFmt] of pairs) {
    const input = $("#" + inputId);
    const out = $("#" + outId);
    if (!input || !out) continue;
    const update = () => {
      out.textContent = fmt(input.value);
      input.setAttribute("aria-valuetext", ariaFmt(input.value));
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
    flake: 0,
    browsers: ["bChrome"],
    artifacts: ["toggleScreenshots"],
    insight: "Fast: a tiny Chromium smoke path optimized for immediate deploy feedback.",
  },
  balanced: {
    parallelism: 6,
    retries: 1,
    flake: 3,
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

  const applyPreset = (name, { invalidate = false } = {}) => {
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
    if (invalidate) invalidateSuiteResult();
  };

  for (const button of buttons) {
    button.addEventListener("click", () => applyPreset(button.dataset.suitePreset ?? "balanced", { invalidate: true }));
  }

  for (const input of $all(".controls input")) {
    input.addEventListener("input", () => {
      if (applyingPreset) return;
      setActive("");
      insight.textContent = "Custom: your suite, your tradeoffs. Run it to see the release signal.";
      invalidateSuiteResult();
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
  const progress = $("#runnerProgress");
  const value = clamp(0, pct, 100);
  if (bar) bar.style.width = `${value}%`;
  progress?.setAttribute("aria-valuenow", String(Math.round(value)));
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

let lastSuiteReport = "";

function invalidateSuiteResult() {
  if (suiteRunInFlight || !lastSuiteReport) return;
  const wrap = $("#runnerVerdict");
  const title = $("#runnerVerdictTitle");
  const text = $("#runnerVerdictText");
  const copy = $("#copyRunBtn");
  if (wrap) wrap.dataset.tone = "warn";
  if (title) title.textContent = "CONFIGURATION CHANGED";
  if (text) text.textContent = "The previous verdict no longer matches these controls. Run the suite again for a current release signal.";
  setRunnerStatus("Configuration changed");
  setRunnerSummary({ duration: "—", total: "—", passed: "—", failed: "—", flaky: "—" });
  appendLog("[config] Suite controls changed — rerun required for a current verdict.", "warn");
  lastSuiteReport = "";
  if (copy) copy.disabled = true;
}

function setRunnerVerdict({ failed = 0, flaky = 0, cfg = null, duration = "—", total = 0 } = {}) {
  const wrap = $("#runnerVerdict");
  const title = $("#runnerVerdictTitle");
  const text = $("#runnerVerdictText");
  const copy = $("#copyRunBtn");
  if (!wrap || !title || !text) return;

  let tone = "good";
  let verdict = "SHIP";
  let explanation = "The release gate is green with no simulated flakes in this run.";
  if (failed > 0) {
    tone = "bad";
    verdict = "BLOCK";
    explanation = `${failed} test${failed === 1 ? "" : "s"} failed. Use the captured evidence to diagnose before release.`;
  } else if (flaky > 0) {
    tone = "warn";
    verdict = "SHIP WITH FOLLOW-UP";
    explanation = `Retries recovered the run, but ${flaky} flaky test${flaky === 1 ? "" : "s"} remain visible and need ownership.`;
  }

  wrap.dataset.tone = tone;
  title.textContent = verdict;
  text.textContent = explanation;
  lastSuiteReport = [
    `Release verdict: ${verdict}`,
    `Outcome: ${total} tests · ${failed} failed · ${flaky} flaky`,
    `Duration: ${duration}`,
    cfg ? `Configuration: ${cfg.parallelism} workers · ${cfg.retries} retries · ${cfg.browsers.join(", ")}` : "",
    explanation,
  ].filter(Boolean).join("\n");
  if (copy) copy.disabled = !lastSuiteReport;
}

function seedRunner() {
  const runnerTitle = $("#runnerTitle");
  const verdict = $("#runnerVerdict");
  const verdictTitle = $("#runnerVerdictTitle");
  const verdictText = $("#runnerVerdictText");
  const copy = $("#copyRunBtn");
  if (runnerTitle) runnerTitle.textContent = "Pipeline • ready";
  setRunnerStatus("Ready");
  setRunnerProgress(0);
  setRunnerSummary({ duration: "—", total: "—", passed: "—", failed: "—", flaky: "—" });
  clearLog();
  appendLog("[ready] Choose a preset, adjust the controls, then run the simulated suite.");
  if (verdict) verdict.dataset.tone = "ready";
  if (verdictTitle) verdictTitle.textContent = "AWAITING RUN";
  if (verdictText) verdictText.textContent = "No release verdict exists until the simulated suite completes.";
  lastSuiteReport = "";
  if (copy) copy.disabled = true;
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
  for (const control of $all("#runSuiteBtn, [data-suite-preset], .controls input")) {
    control.toggleAttribute("disabled", running);
    if (control.id === "runSuiteBtn") control.classList.toggle("btn--disabled", running);
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
    lastSuiteReport = "";
    const copy = $("#copyRunBtn");
    if (copy) copy.disabled = true;
    const verdict = $("#runnerVerdict");
    if (verdict) verdict.dataset.tone = "running";
    const verdictTitle = $("#runnerVerdictTitle");
    const verdictText = $("#runnerVerdictText");
    if (verdictTitle) verdictTitle.textContent = "RUNNING";
    if (verdictText) verdictText.textContent = "Collecting enough signal to make a release decision.";

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
    const effectiveFailures = Math.max(0, rawFlakes - clamp(0, cfg.retries, 3) * 2);
    failed = effectiveFailures;
    passed = totalTests - failed;

    if (failed) {
      appendLog(`[suite] ${passed} passed • ${failed} failed • ${flaky} flaky`, "bad");
    } else if (flaky) {
      appendLog(`[suite] ${passed} passed • ${failed} failed • ${flaky} flaky`, "warn");
    } else {
      appendLog(`[suite] ${passed} passed • ${failed} failed • ${flaky} flaky`, "good");
    }

    if (flaky && cfg.screenshots) appendLog(`[artifact] failure-attempt screenshots: attached`, "good");
    if (flaky && cfg.trace) appendLog(`[artifact] trace.zip: attached`, "good");
    if (flaky && cfg.video) appendLog(`[artifact] run.mp4: attached`, "good");

    const duration = performance.now() - startedAt;
    const formattedDuration = formatDuration(duration);
    setRunnerStatus(failed ? "Failed" : flaky ? "Passed with flakes" : "Passed");
    setRunnerProgress(100);
    setRunnerSummary({ duration: formattedDuration, total: totalTests, passed, failed, flaky });
    setRunnerVerdict({ failed, flaky, cfg, duration: formattedDuration, total: totalTests });

    if (failed) {
      showToast("Release blocked by failures");
    } else if (flaky) {
      showToast("Passed with flaky retries—follow-up required");
    } else {
      showToast("Green build");
      burstConfetti({ count: 46 });
    }
  } catch (error) {
    console.error(error);
    setRunnerStatus("Error");
    appendLog("[ci] unexpected error, please retry", "bad");
    const verdict = $("#runnerVerdict");
    const verdictTitle = $("#runnerVerdictTitle");
    const verdictText = $("#runnerVerdictText");
    const copy = $("#copyRunBtn");
    if (verdict) verdict.dataset.tone = "bad";
    if (verdictTitle) verdictTitle.textContent = "ERROR";
    if (verdictText) verdictText.textContent = "The simulated run did not complete. Retry to generate a release verdict.";
    lastSuiteReport = "";
    if (copy) copy.disabled = true;
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
    document.documentElement.classList.add("reveal-ready");
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
  document.documentElement.classList.add("reveal-ready");
}

function initScrollProgress() {
  const bar = $("#scrollProgressBar");
  if (!bar) return;
  let frameId = 0;
  const update = () => {
    frameId = 0;
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const pct = max > 0 ? (doc.scrollTop / max) * 100 : 0;
    bar.style.width = `${pct}%`;
  };
  const onScroll = () => {
    if (!frameId) frameId = requestAnimationFrame(update);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  update();
}

function initBackToTop() {
  $("#backToTop")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });
}

function initHeroCanvas() {
  const canvas = $("#heroCanvas");
  if (!canvas) return;
  if (reduceMotion) return;

  let ctx = null;

  let w = 0;
  let h = 0;
  let visible = true;
  let engaged = false;
  let initialized = false;
  let frameId = 0;
  const dpr = 1;
  const particles = [];
  const count = 28;

  function resize() {
    if (!ctx) return;
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
        r: 1.4 + Math.random() * 2.2,
        warm: i % 3 === 0,
      });
    }
  }

  function paint({ advance = true } = {}) {
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) {
      if (advance) {
        p.x += p.vx;
        p.y += p.vy;
      }
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;

      ctx.fillStyle = p.warm ? "rgba(255,95,69,0.24)" : "rgba(0,180,216,0.2)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
  }

  function draw() {
    frameId = 0;
    if (document.hidden || !visible) return;
    paint();
    frameId = requestAnimationFrame(draw);
  }

  const start = () => {
    if (!frameId && !document.hidden && visible) frameId = requestAnimationFrame(draw);
  };

  const onResize = () => {
    resize();
    seed();
    paint({ advance: false });
  };
  window.addEventListener("resize", () => {
    if (initialized) onResize();
  }, { passive: true });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible && engaged) start();
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
    } else if (engaged) {
      start();
    }
  });
  const hero = canvas.closest(".hero");
  hero?.addEventListener("pointermove", () => {
    engaged = true;
    if (!initialized) {
      ctx = canvas.getContext("2d");
      if (!ctx) return;
      initialized = true;
      onResize();
    }
    start();
  }, { passive: true });
  hero?.addEventListener("pointerleave", () => {
    engaged = false;
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
  }, { passive: true });
}

function showRandomQaTip() {
  const tip = pickRandom(content.qaTips ?? []);
  if (!tip) return;
  const trimmed = tip.length > 120 ? `${tip.slice(0, 117)}...` : tip;
  showToast(`QA tip: ${trimmed}`);
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
    const originalRepos = (repos ?? []).filter((repo) => !repo.fork);
    const latest = originalRepos[0] ?? repos?.[0];
    const top = [...originalRepos].sort((a, b) => toNumber(b.stargazers_count, 0) - toNumber(a.stargazers_count, 0))[0] ?? latest;

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
  const topText = data.topName ? `top recent original ${data.topName}${data.topStars ? ` (${formatCompactNumber(data.topStars)} stars)` : ""}` : "";
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

function initGitHubPulseControl() {
  const refresh = $("#githubPulseRefresh");
  if (!refresh) return;
  refresh.addEventListener("click", async () => {
    refresh.disabled = true;
    try {
      await initGitHubPulse({ force: true, notify: true });
    } finally {
      refresh.disabled = false;
    }
  });
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
    { label: "Open: 60-second brief", hint: "Recruiter mode", kbd: "OPEN", run: () => window.dispatchEvent(new Event("portfolio:open-brief")) },
    { label: "Go to: Flagship Work", hint: "Scroll", kbd: "GO", run: () => location.hash = "#projects" },
    { label: "Go to: About", hint: "Scroll", kbd: "GO", run: () => location.hash = "#about" },
    { label: "Go to: Capabilities", hint: "Scroll", kbd: "GO", run: () => location.hash = "#skills" },
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
    btn.title = open ? "Close command palette" : "Command palette (Ctrl/⌘ K)";
    setButtonLabel(btn, open ? "Close command palette" : "Open command palette");
    if (open) window.dispatchEvent(new CustomEvent("portfolio:modal-open", { detail: "palette" }));
    syncBodyScrollLock();
    if (open) {
      returnFocusTo = btn;
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
    setOpen(false);
    if (cmd?.run) cmd.run();
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

  window.addEventListener("portfolio:modal-open", (event) => {
    if (event.detail !== "palette" && open) setOpen(false);
  });

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
  $("#copyRunBtn")?.addEventListener("click", async () => {
    const ok = await copyToClipboard(lastSuiteReport);
    showToast(ok ? "Run report copied" : "Couldn’t copy run report");
  });
  seedRunner();
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
    btn.title = open ? "Close menu" : "Menu";
    setButtonLabel(btn, open ? "Close menu" : "Open menu");
    if (open) window.dispatchEvent(new CustomEvent("portfolio:modal-open", { detail: "mobile-menu" }));
    syncBodyScrollLock();
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

  window.addEventListener("portfolio:modal-open", (event) => {
    if (event.detail !== "mobile-menu" && open) setOpen(false);
  });

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

function runInitStep(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.catch === "function") {
      result.catch((error) => console.error(`[portfolio] ${name} failed`, error));
    }
  } catch (error) {
    console.error(`[portfolio] ${name} failed`, error);
  }
}

function scheduleInitSteps(steps) {
  let index = 0;
  const runNext = () => {
    const step = steps[index];
    index += 1;
    if (step) runInitStep(step[0], step[1]);
    if (index < steps.length) window.setTimeout(runNext, 0);
  };
  if (steps.length) window.setTimeout(runNext, 0);
}

function init() {
  const immediateSteps = [
    ["theme", initTheme],
    ["skip link", initSkipLink],
    ["reveal motion", initReveal],
    ["GitHub pulse control", initGitHubPulseControl],
  ];
  const enhancementSteps = [
    ["theme control", initThemeToggle],
    ["mobile menu", initMobileMenu],
    ["project reports", initProjectReport],
    ["projects", renderProjects],
    ["60-second brief", initBrief],
    ["command palette", initCmdPalette],
    ["contact details", setContactAndResume],
    ["email link", initEmailLink],
    ["footer year", setFooterYear],
    ["Los Angeles clock", initLaClock],
    ["range labels", setRanges],
    ["suite presets", initSuitePresets],
    ["QA challenge", initQaChallenge],
    ["flake estimator", initFlakeCostEstimator],
    ["suite runner", initRunSuite],
    ["active navigation", initActiveNav],
    ["scroll progress", initScrollProgress],
    ["back to top", initBackToTop],
    ["keyboard easter egg", initKonami],
    ["spotlight", ensureSpotlight],
    ["quality cube", initQualityCube],
    ["hero canvas", initHeroCanvas],
  ];

  try {
    for (const [name, fn] of immediateSteps) runInitStep(name, fn);
  } finally {
    document.documentElement.classList.add("app-ready");
  }
  scheduleInitSteps(enhancementSteps);
}

init();
