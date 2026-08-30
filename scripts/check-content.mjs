import { content } from "../assets/content.js";
import { readFile } from "node:fs/promises";

const errors = [];

const PLACEHOLDER_PATTERN = /\b(replace me|202x|company name|previous company|tbd)\b/i;

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

const person = content.person ?? {};
if (!isNonEmptyString(person.name)) fail("person.name is required");
if (!isNonEmptyString(person.role)) fail("person.role is required");
if (!isNonEmptyString(person.location)) fail("person.location is required");
if (!isNonEmptyString(person.email) || !person.email.includes("@")) fail("person.email must be a valid email");
if (!isHttpUrl(person.headshotUrl)) fail("person.headshotUrl must be a valid http(s) URL");
if (!isHttpUrl(person.resumeUrl)) fail("person.resumeUrl must be a valid http(s) URL");

for (const [idx, link] of (person.links ?? []).entries()) {
  const label = `person.links[${idx}]`;
  if (!isNonEmptyString(link.label)) fail(`${label}.label is required`);
  if (!isLinkUrl(link.url)) fail(`${label}.url must be a valid http(s) or mailto URL`);
}

for (const [idx, principle] of (content.principles ?? []).entries()) {
  const label = `principles[${idx}]`;
  if (!isNonEmptyString(principle.number)) fail(`${label}.number is required`);
  if (!isNonEmptyString(principle.title)) fail(`${label}.title is required`);
  if (!isNonEmptyString(principle.text)) fail(`${label}.text is required`);
}

for (const [idx, project] of (content.projects ?? []).entries()) {
  const label = `projects[${idx}]`;
  if (!isNonEmptyString(project.name)) fail(`${label}.name is required`);

  const code = project.links?.code ?? "";
  const demo = project.links?.demo ?? "";
  if (!isHttpUrl(code) && !isHttpUrl(demo)) {
    fail(`${label} must include at least one valid http(s) link (code or demo)`);
  }

  if (isNonEmptyString(code) && !isHttpUrl(code)) fail(`${label}.links.code is not a valid http(s) URL`);
  if (isNonEmptyString(demo) && !isHttpUrl(demo)) fail(`${label}.links.demo is not a valid http(s) URL`);
  if (!isNonEmptyString(project.updatedAt) || !Number.isFinite(Date.parse(project.updatedAt))) {
    fail(`${label}.updatedAt must be a valid date`);
  }

  if (PLACEHOLDER_PATTERN.test(JSON.stringify(project))) {
    fail(`${label} still contains placeholder text`);
  }
}

const indexHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
const requiredStaticMetadata = [person.name, person.role, person.location, person.email, person.headshotUrl];
for (const value of requiredStaticMetadata) {
  if (!indexHtml.includes(value)) fail(`index.html metadata is missing current content value: ${value}`);
}

const wholeContent = JSON.stringify(content);
if (PLACEHOLDER_PATTERN.test(wholeContent)) {
  fail("content.js still contains placeholder text");
}

if (errors.length) {
  console.error("Content checks failed:\n");
  for (const err of errors) console.error(`- ${err}`);
  process.exit(1);
}

console.log("Content checks passed.");
