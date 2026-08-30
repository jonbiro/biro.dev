import { access, readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { content } from "../assets/content.js";

const errors = [];
const projectRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
const PLACEHOLDER_PATTERN = /\b(replace me|202x|company name|previous company|tbd)\b/i;
const PROJECT_CATEGORIES = new Set(["Automation", "Apps", "Play"]);

function fail(message) {
  errors.push(message);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpUrl(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isLinkUrl(value) {
  return isHttpUrl(value) || (isNonEmptyString(value) && value.startsWith("mailto:"));
}

function isNavigableUrl(value) {
  return isLinkUrl(value) || (isNonEmptyString(value) && /^#[A-Za-z][\w:.-]*$/.test(value));
}

function requireString(value, label) {
  if (!isNonEmptyString(value)) fail(`${label} is required`);
}

function requireStringList(value, label, minimum = 1) {
  if (!Array.isArray(value) || value.length < minimum) {
    fail(`${label} must contain at least ${minimum} item${minimum === 1 ? "" : "s"}`);
    return;
  }
  for (const [index, item] of value.entries()) requireString(item, `${label}[${index}]`);
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function validateLocalAsset(value, label) {
  if (!isNonEmptyString(value) || isHttpUrl(value)) return;
  if (value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    fail(`${label} must use a safe project-relative path`);
    return;
  }
  const resolved = resolve(projectRoot, value);
  if (!resolved.startsWith(`${projectRoot}${sep}`)) {
    fail(`${label} escapes the project root`);
    return;
  }
  try {
    await access(resolved);
  } catch {
    fail(`${label} points to a missing file: ${value}`);
  }
}

const person = content.person ?? {};
requireString(person.name, "person.name");
requireString(person.fullName, "person.fullName");
requireString(person.role, "person.role");
requireString(person.location, "person.location");
requireString(person.focusLine, "person.focusLine");
requireString(person.headline, "person.headline");
requireString(person.subheadline, "person.subheadline");
if (!isNonEmptyString(person.email) || !person.email.includes("@")) fail("person.email must be a valid email");
if (!isHttpUrl(person.headshotUrl) && !isNonEmptyString(person.headshotUrl)) {
  fail("person.headshotUrl must be a valid http(s) URL or local asset");
} else {
  await validateLocalAsset(person.headshotUrl, "person.headshotUrl");
}
if (!isHttpUrl(person.resumeUrl)) fail("person.resumeUrl must be a valid http(s) URL");

for (const [index, link] of (person.links ?? []).entries()) {
  const label = `person.links[${index}]`;
  requireString(link.label, `${label}.label`);
  if (!isLinkUrl(link.url)) fail(`${label}.url must be a valid http(s) or mailto URL`);
}

for (const [index, impact] of (person.impact ?? []).entries()) {
  requireString(impact.label, `person.impact[${index}].label`);
  requireString(impact.value, `person.impact[${index}].value`);
  if (isNonEmptyString(impact.href) && !isNavigableUrl(impact.href)) {
    fail(`person.impact[${index}].href must be an http(s), mailto, or fragment URL`);
  }
}

const about = content.about ?? {};
requireString(about.subtitle, "about.subtitle");
requireString(about.lead, "about.lead");
requireStringList(about.bullets, "about.bullets", 3);
for (const [index, card] of (about.cards ?? []).entries()) {
  requireString(card.title, `about.cards[${index}].title`);
  requireString(card.text, `about.cards[${index}].text`);
}

for (const [index, skill] of (content.skills ?? []).entries()) {
  requireString(skill.category, `skills[${index}].category`);
  requireString(skill.summary, `skills[${index}].summary`);
  requireStringList(skill.items, `skills[${index}].items`);
}

for (const [index, principle] of (content.principles ?? []).entries()) {
  const label = `principles[${index}]`;
  requireString(principle.number, `${label}.number`);
  requireString(principle.title, `${label}.title`);
  requireString(principle.text, `${label}.text`);
  requireStringList(principle.tags, `${label}.tags`);
}

const projectNames = new Set();
const projectSlugs = new Set();
for (const [index, project] of (content.projects ?? []).entries()) {
  const label = `projects[${index}]`;
  requireString(project.name, `${label}.name`);
  requireString(project.eyebrow, `${label}.eyebrow`);
  requireString(project.description, `${label}.description`);
  requireStringList(project.highlights, `${label}.highlights`);
  requireStringList(project.tags, `${label}.tags`);
  if (!PROJECT_CATEGORIES.has(project.category)) fail(`${label}.category must be Automation, Apps, or Play`);

  if (projectNames.has(project.name)) fail(`${label}.name must be unique`);
  projectNames.add(project.name);
  const slug = slugify(project.slug ?? project.name);
  if (!slug || projectSlugs.has(slug)) fail(`${label} must resolve to a unique project slug`);
  projectSlugs.add(slug);

  const code = project.links?.code ?? "";
  const demo = project.links?.demo ?? "";
  if (!isHttpUrl(code) && !isHttpUrl(demo)) fail(`${label} must include at least one valid http(s) link (code or demo)`);
  if (isNonEmptyString(code) && !isHttpUrl(code)) fail(`${label}.links.code is not a valid http(s) URL`);
  if (isNonEmptyString(demo) && !isHttpUrl(demo)) fail(`${label}.links.demo is not a valid http(s) URL`);
  if (!isNonEmptyString(project.updatedAt) || !Number.isFinite(Date.parse(project.updatedAt))) {
    fail(`${label}.updatedAt must be a valid date`);
  }
  if (isNonEmptyString(project.verifiedAt) && !Number.isFinite(Date.parse(project.verifiedAt))) {
    fail(`${label}.verifiedAt must be a valid date`);
  }

  if (isNonEmptyString(project.imageUrl)) {
    requireString(project.imageAlt, `${label}.imageAlt`);
    requireString(project.visualLabel, `${label}.visualLabel`);
    await validateLocalAsset(project.imageUrl, `${label}.imageUrl`);
  }

  for (const [galleryIndex, image] of (project.gallery ?? []).entries()) {
    requireString(image.src, `${label}.gallery[${galleryIndex}].src`);
    requireString(image.alt, `${label}.gallery[${galleryIndex}].alt`);
    await validateLocalAsset(image.src, `${label}.gallery[${galleryIndex}].src`);
  }

  if (project.caseStudy) {
    const caseLabel = `${label}.caseStudy`;
    requireString(project.caseStudy.label, `${caseLabel}.label`);
    requireString(project.caseStudy.context, `${caseLabel}.context`);
    requireStringList(project.caseStudy.risks, `${caseLabel}.risks`, 2);
    requireStringList(project.caseStudy.strategy, `${caseLabel}.strategy`, 2);
    requireString(project.caseStudy.owned, `${caseLabel}.owned`);
    requireString(project.caseStudy.decision, `${caseLabel}.decision`);
    requireString(project.caseStudy.tradeoff, `${caseLabel}.tradeoff`);
    requireString(project.caseStudy.next, `${caseLabel}.next`);
    if (!Array.isArray(project.caseStudy.evidence) || project.caseStudy.evidence.length < 2) {
      fail(`${caseLabel}.evidence must contain at least 2 items`);
    } else {
      for (const [evidenceIndex, evidence] of project.caseStudy.evidence.entries()) {
        requireString(evidence.value, `${caseLabel}.evidence[${evidenceIndex}].value`);
        requireString(evidence.label, `${caseLabel}.evidence[${evidenceIndex}].label`);
        if (isNonEmptyString(evidence.href) && !isNavigableUrl(evidence.href)) {
          fail(`${caseLabel}.evidence[${evidenceIndex}].href must be an http(s), mailto, or fragment URL`);
        }
      }
    }

    const verification = project.caseStudy.verification;
    if (verification) {
      requireString(verification.label, `${caseLabel}.verification.label`);
      requireString(verification.status, `${caseLabel}.verification.status`);
      requireString(verification.command, `${caseLabel}.verification.command`);
      requireString(verification.commit, `${caseLabel}.verification.commit`);
      if (!isHttpUrl(verification.commitUrl)) fail(`${caseLabel}.verification.commitUrl must be a valid http(s) URL`);
      requireString(verification.checkedOn, `${caseLabel}.verification.checkedOn`);
      requireStringList(verification.details, `${caseLabel}.verification.details`, 2);
    }

    const architecture = project.caseStudy.architecture;
    if (architecture) {
      if (!Array.isArray(architecture) || architecture.length < 3) {
        fail(`${caseLabel}.architecture must contain at least 3 layers`);
      } else {
        for (const [architectureIndex, layer] of architecture.entries()) {
          const layerLabel = `${caseLabel}.architecture[${architectureIndex}]`;
          requireString(layer.step, `${layerLabel}.step`);
          requireString(layer.title, `${layerLabel}.title`);
          requireString(layer.text, `${layerLabel}.text`);
          requireString(layer.path, `${layerLabel}.path`);
        }
      }
    }
  }

  if (PLACEHOLDER_PATTERN.test(JSON.stringify(project))) fail(`${label} still contains placeholder text`);
}

const dossier = content.qualityDossier ?? {};
if (!isNonEmptyString(dossier.checkedAt) || !Number.isFinite(Date.parse(dossier.checkedAt))) {
  fail("qualityDossier.checkedAt must be a valid date");
}
requireString(dossier.checkedOn, "qualityDossier.checkedOn");
requireString(dossier.summary, "qualityDossier.summary");
requireStringList(dossier.checks, "qualityDossier.checks", 3);
for (const [index, metric] of (dossier.metrics ?? []).entries()) {
  requireString(metric.value, `qualityDossier.metrics[${index}].value`);
  requireString(metric.label, `qualityDossier.metrics[${index}].label`);
}

for (const [index, challenge] of (content.qaChallenges ?? []).entries()) {
  const label = `qaChallenges[${index}]`;
  requireString(challenge.question, `${label}.question`);
  requireStringList(challenge.choices, `${label}.choices`, 2);
  if (!Number.isInteger(challenge.answer) || challenge.answer < 0 || challenge.answer >= (challenge.choices?.length ?? 0)) {
    fail(`${label}.answer must point to one of its choices`);
  }
  requireString(challenge.rationale, `${label}.rationale`);
}
requireStringList(content.qaTips, "qaTips", 3);

const indexHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
const coreStaticCopy = [
  person.name,
  person.role,
  person.location,
  person.focusLine,
  person.email,
  person.headshotUrl,
  person.headline,
  person.subheadline,
  ...((person.impact ?? []).flatMap(({ label, value }) => [label, value])),
  about.subtitle,
  about.lead,
  ...(about.bullets ?? []),
  ...((about.cards ?? []).flatMap(({ title, text }) => [title, text])),
  ...((content.skills ?? []).flatMap(({ category, summary, items }) => [category, summary, ...(items ?? [])])),
  ...((content.principles ?? []).flatMap(({ title, text, tags }) => [title, text, ...(tags ?? [])])),
  ...((content.projects ?? []).flatMap(({ name, description, highlights }) => [name, description, ...(highlights ?? [])])),
  dossier.summary,
  ...((dossier.metrics ?? []).flatMap(({ value, label }) => [value, label])),
  ...(dossier.checks ?? []),
].filter(isNonEmptyString);

for (const value of new Set(coreStaticCopy)) {
  if (!indexHtml.includes(value)) fail(`index.html static fallback is missing current content: ${value}`);
}

const canonicalMatch = indexHtml.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
const canonical = canonicalMatch?.[1] ?? "";
if (!isHttpUrl(canonical)) fail("index.html must include a valid canonical URL");

for (const assetPath of [
  "assets/og.jpg",
  "assets/favicon.svg",
  "assets/headshot-placeholder.svg",
  "assets/headshot.jpg",
  "assets/fonts/sora-latin.woff2",
  "assets/fonts/space-grotesk-latin.woff2",
  "assets/fonts/LICENSE-Sora.txt",
  "assets/fonts/LICENSE-Space-Grotesk.txt",
]) {
  await validateLocalAsset(assetPath, assetPath);
}

const manifestText = await readFile(new URL("../site.webmanifest", import.meta.url), "utf8");
try {
  const manifest = JSON.parse(manifestText);
  requireString(manifest.name, "site.webmanifest name");
  requireString(manifest.short_name, "site.webmanifest short_name");
  if (manifest.start_url !== "/") fail("site.webmanifest start_url must be /");
  if (!Array.isArray(manifest.icons) || !manifest.icons.length) fail("site.webmanifest must include an icon");
  for (const [index, icon] of (manifest.icons ?? []).entries()) {
    await validateLocalAsset(String(icon.src ?? "").replace(/^\//, ""), `site.webmanifest.icons[${index}].src`);
  }
} catch (error) {
  fail(`site.webmanifest must be valid JSON: ${error.message}`);
}

const robots = await readFile(new URL("../robots.txt", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../sitemap.xml", import.meta.url), "utf8");
if (canonical) {
  if (!robots.includes(`${canonical}sitemap.xml`)) fail("robots.txt sitemap URL must match the canonical host");
  if (!sitemap.includes(`<loc>${canonical}</loc>`)) fail("sitemap.xml URL must match the canonical URL");
}

const wholeContent = JSON.stringify(content);
if (PLACEHOLDER_PATTERN.test(wholeContent)) fail("content.js still contains placeholder text");

if (errors.length) {
  console.error("Content checks failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Content checks passed (${content.projects.length} projects, ${projectSlugs.size} unique anchors).`);
