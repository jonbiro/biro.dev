import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function mockGitHub(page) {
  await page.route("https://api.github.com/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/repos?")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([
          {
            name: "super-seerr-extension",
            fork: false,
            pushed_at: "2026-08-29T12:00:00Z",
            stargazers_count: 12,
          },
        ]),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ public_repos: 14, followers: 9 }),
    });
  });
}

function observeRuntimeErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  return errors;
}

async function openPortfolio(page) {
  await mockGitHub(page);
  const errors = observeRuntimeErrors(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveClass(/app-ready/);
  await expect(page.locator("#githubPulseValue")).toContainText("14 repos");
  return errors;
}

test("boots with honest, recruiter-ready proof", async ({ page }) => {
  const errors = await openPortfolio(page);

  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.locator("#projectsGrid .project")).toHaveCount(5);
  await expect(page.locator("#projectsGrid .project__title")).toHaveText([
    "Super Seerr Extension",
    "Interactive QA Portfolio",
    "PWA Testing Lab",
    "Travlr",
    "DogeQuest 1989",
  ]);
  await expect(page.locator("#impactStats")).toContainText("36/36 passing");
  await expect(page.locator("#skillsGrid .skill-cat")).toHaveCount(5);
  await expect(page.locator("#dossierMetrics .dossier-metric")).toHaveCount(4);
  await expect(page.locator("#runnerVerdictTitle")).toHaveText("AWAITING RUN");
  await expect(page.locator("#copyRunBtn")).toBeDisabled();
  await expect(page.locator("#footerYear")).toHaveText(String(new Date().getFullYear()));
  const unsafeExternalLinks = await page.locator('a[href^="http"]').evaluateAll((links) =>
    links
      .filter((link) => link.target !== "_blank" || !link.rel.split(/\s+/).includes("noopener") || !link.rel.split(/\s+/).includes("noreferrer"))
      .map((link) => link.getAttribute("href")),
  );
  expect(unsafeExternalLinks).toEqual([]);
  expect(errors).toEqual([]);
});

test("core portfolio remains useful without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Yoni Biro/);
  await expect(page.locator("#projectsGrid .project")).toHaveCount(5);
  await expect(page.locator("#projectsGrid")).toContainText("36/36 passing");
  await expect(page.locator("#skillsGrid .skill-cat")).toHaveCount(5);
  await expect(page.locator("#emailLink")).toHaveAttribute("href", "mailto:jonathan@biro.dev");
  await expect(page.locator(".projects-toolbar")).toBeHidden();
  await expect(page.locator(".noscript-note")).toBeVisible();

  await context.close();
});

test("skip link, theme, and command palette work from the keyboard", async ({ page }) => {
  const errors = await openPortfolio(page);

  await page.locator(".skip-link").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const initialTheme = await page.locator("html").getAttribute("data-theme");
  await page.locator("#themeToggle").click();
  const toggledTheme = initialTheme === "dark" ? "light" : "dark";
  await expect(page.locator("html")).toHaveAttribute("data-theme", toggledTheme);
  await expect(page.locator("#themeToggle")).toHaveAttribute("aria-pressed", String(toggledTheme === "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", toggledTheme);

  await page.keyboard.press("Control+k");
  await expect(page.locator("#palette")).toHaveAttribute("data-open", "true");
  await expect(page.locator("#palette")).not.toHaveAttribute("inert", "");
  await expect(page.locator("#paletteInput")).toBeFocused();
  await page.locator("#paletteInput").fill("theme");
  await expect(page.locator("#paletteList .cmd")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(page.locator("#palette")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#cmdkBtn")).toBeFocused();
  expect(errors).toEqual([]);
});

test("mobile menu traps focus and restores it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openPortfolio(page);

  await page.locator("#menuBtn").click();
  await expect(page.locator("#mobileMenu")).toHaveAttribute("data-open", "true");
  await expect(page.locator("#menuBtn")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".mobile-menu__link").first()).toBeFocused();
  const menuAxe = await new AxeBuilder({ page }).include("#mobileMenu").analyze();
  expect(menuAxe.violations.filter((item) => ["serious", "critical"].includes(item.impact))).toEqual([]);
  await page.locator(".mobile-menu__close").focus();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(".mobile-menu__link").last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator(".mobile-menu__close")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobileMenu")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#menuBtn")).toBeFocused();
  await expect(page.locator("body")).not.toHaveClass(/no-scroll/);
  expect(errors).toEqual([]);
});

test("project discovery and evidence sheets are complete", async ({ page }) => {
  const errors = await openPortfolio(page);

  await page.getByRole("button", { name: /^Automation/ }).click();
  await expect(page.locator("#projectsGrid .project")).toHaveCount(3);
  await expect(page.locator("#projectResultsStatus")).toHaveText("Showing 3 of 5 projects");

  await page.getByRole("button", { name: /^All/ }).click();
  await page.locator("#projectSearch").fill("Rails");
  await expect(page.locator("#projectsGrid .project__title")).toHaveText(["Travlr"]);
  await page.locator("#projectSearch").fill("");
  await page.getByRole("button", { name: "A–Z" }).click();
  await expect(page.locator("#projectsGrid .project__title")).toHaveText([
    "DogeQuest 1989",
    "Interactive QA Portfolio",
    "PWA Testing Lab",
    "Super Seerr Extension",
    "Travlr",
  ]);

  await page.getByRole("button", { name: "Featured" }).click();
  const reportButton = page.locator("#project-super-seerr .project__report");
  await reportButton.click();
  await expect(page.locator("#projectReport")).toHaveAttribute("data-open", "true");
  await expect(page.locator("#reportTitle")).toHaveText("Super Seerr Extension");
  await expect(page.locator("#reportEvidence")).toContainText("36");
  await expect(page.locator("#reportGallery img")).toHaveCount(2);
  await expect(page.locator("body")).toHaveClass(/no-scroll/);
  await page.keyboard.press("Escape");
  await expect(page.locator("#projectReport")).toHaveAttribute("aria-hidden", "true");
  await expect(reportButton).toBeFocused();

  await page.locator("#briefBtn").click();
  await expect(page.locator("#brief")).toHaveAttribute("data-open", "true");
  await expect(page.locator(".brief__proof")).toContainText("36");
  await expect(page.locator("body")).toHaveClass(/no-scroll/);
  await page.locator("#briefWorkBtn").click();
  await expect(page.locator("#projectReport")).toHaveAttribute("data-open", "true");
  await page.locator("[data-close-report]").last().click();
  await expect(page.locator("#briefBtn")).toBeFocused();
  expect(errors).toEqual([]);
});

test("QA challenge, suite presets, and copyable verdicts behave deterministically", async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const errors = await openPortfolio(page);

  await page.locator("#challengeChoices .qa-choice").nth(2).click();
  await expect(page.locator("#challengeFeedback")).toContainText("Strong call");
  await expect(page.locator("#challengeNext")).toBeFocused();
  await page.locator("#challengeNext").click();
  await expect(page.locator("#challengeIndex")).toHaveText("2 / 3");
  await expect(page.locator("#challengeChoices .qa-choice").first()).toBeFocused();

  for (const id of ["bChrome", "bFirefox", "bWebKit"]) await page.locator(`#${id}`).uncheck();
  await page.locator("#runSuiteBtn").click();
  await expect(page.locator("#toast")).toContainText("Pick at least one browser");
  await expect(page.locator("#runnerVerdictTitle")).toHaveText("AWAITING RUN");

  await page.getByRole("button", { name: /Balanced/ }).click();
  await expect(page.locator("#parallelism")).toHaveValue("6");
  await expect(page.locator("#retries")).toHaveValue("1");
  await expect(page.locator("#flake")).toHaveValue("3");
  await page.locator("#runSuiteBtn").click();
  await expect(page.locator("#runnerStatus")).toHaveText("Passed", { timeout: 5_000 });
  await expect(page.locator("#runnerProgress")).toHaveAttribute("aria-valuenow", "100");
  await expect(page.locator("#runnerVerdictTitle")).toHaveText("SHIP WITH FOLLOW-UP");
  await expect(page.locator(".confetti-layer")).toHaveCount(0);
  await expect(page.locator("#copyRunBtn")).toBeEnabled();
  await page.locator("#copyRunBtn").click();
  await expect(page.locator("#toast")).toContainText("Run report copied");

  await page.getByRole("button", { name: /Fast/ }).click();
  await page.locator("#runSuiteBtn").click();
  await expect(page.locator("#runnerStatus")).toHaveText("Passed", { timeout: 5_000 });
  await expect(page.locator("#runnerVerdictTitle")).toHaveText("SHIP");

  await page.getByRole("button", { name: /Chaos/ }).click();
  await page.locator("#runSuiteBtn").click();
  await expect(page.locator("#runnerStatus")).toHaveText("Failed", { timeout: 5_000 });
  await expect(page.locator("#runnerVerdictTitle")).toHaveText("BLOCK");
  expect(errors).toEqual([]);
});

test("flake estimator stays finite at defaults and boundaries", async ({ page }) => {
  const errors = await openPortfolio(page);
  await expect(page.locator("#flakeCostResult")).toContainText("10 min/day");
  await expect(page.locator("#flakeCostResult")).toContainText("3.7 hours/month");
  await expect(page.locator("#flakeCostResult")).toContainText("5.5 workdays/year");
  await expect(page.locator("#flakeCostResult")).toContainText("2.3%");

  await page.locator("#costFlakeRate").fill("0");
  await expect(page.locator("#flakeCostResult")).toContainText("0 min/day");
  await page.locator("#costRunsPerDay").fill("300");
  await page.locator("#costFlakeRate").fill("100");
  await page.locator("#costRerunMinutes").fill("120");
  await page.locator("#costSuiteMinutes").fill("180");
  await expect(page.locator("#flakeCostResult")).not.toContainText(/NaN|Infinity/);
  expect(errors).toEqual([]);
});

test("responsive layouts do not create horizontal overflow", async ({ page }) => {
  await mockGitHub(page);
  for (const width of [320, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveClass(/app-ready/);
    const overflow = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(overflow.document, `document overflow at ${width}px`).toBeLessThanOrEqual(overflow.viewport + 1);
    expect(overflow.body, `body overflow at ${width}px`).toBeLessThanOrEqual(overflow.viewport + 1);
    const offenders = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".container, .nav, .hero__inner, .projects, .playground, .contact, .project, input"))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
        })
        .map((element) => ({
          selector: element.id ? `#${element.id}` : element.className || element.tagName,
          rect: element.getBoundingClientRect().toJSON(),
        }))
        .filter(({ rect }) => rect.left < -1 || rect.right > window.innerWidth + 1),
    );
    expect(offenders, `visible element overflow at ${width}px`).toEqual([]);
  }
});

test("mobile evidence sheets close at the end and restore focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = await openPortfolio(page);

  const reportButton = page.locator("#project-super-seerr .project__report");
  await reportButton.click();
  const reportPanel = page.locator("#projectReportDialog");
  await reportPanel.evaluate((element) => element.scrollTo(0, element.scrollHeight));
  await page.locator("#projectReport .sheet__bottom-close").click();
  await expect(reportButton).toBeFocused();

  const briefButton = page.locator("#briefBtn");
  await briefButton.click();
  const briefPanel = page.locator("#briefDialog");
  await briefPanel.evaluate((element) => element.scrollTo(0, element.scrollHeight));
  await page.locator("#brief .sheet__bottom-close").click();
  await expect(briefButton).toBeFocused();
  expect(errors).toEqual([]);
});

test("remote GitHub data fails softly without breaking the portfolio", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("https://api.github.com/**", (route) => route.fulfill({ status: 503, body: "unavailable" }));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveClass(/app-ready/);
  await expect(page.locator("#githubPulseValue")).toHaveText("GitHub stats unavailable right now.");
  await expect(page.locator("#projectsGrid .project")).toHaveCount(5);
  expect(pageErrors).toEqual([]);
});

test("serious accessibility issues are blocked on the page and dialogs", async ({ page }) => {
  await openPortfolio(page);

  const initial = await new AxeBuilder({ page }).analyze();
  expect(initial.violations.filter((item) => ["serious", "critical"].includes(item.impact))).toEqual([]);

  await page.keyboard.press("Control+k");
  const palette = await new AxeBuilder({ page }).include("#palette").analyze();
  expect(palette.violations.filter((item) => ["serious", "critical"].includes(item.impact))).toEqual([]);
  await page.keyboard.press("Escape");

  await page.locator("#project-super-seerr .project__report").click();
  const report = await new AxeBuilder({ page }).include("#projectReport").analyze();
  expect(report.violations.filter((item) => ["serious", "critical"].includes(item.impact))).toEqual([]);
});
