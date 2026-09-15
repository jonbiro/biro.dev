export const content = {
  person: {
    name: "Yoni Biro",
    fullName: "Jonathan Biro",
    role: "QA Automation Engineer / SDET",
    location: "Los Angeles, CA",
    email: "jonathan@biro.dev",
    headshotUrl: "assets/headshot.jpg",
    resumeUrl: "https://www.kickresume.com/cv/biro-cv/",
    focusLine: "Full-stack roots → quality engineering",
    headline: "I build reliable automation that turns test results into clear release decisions.",
    subheadline:
      "QA Automation Engineer / SDET in Los Angeles, combining full-stack debugging with risk-based UI, API, and CI coverage.",
    links: [
      { label: "GitHub", url: "https://github.com/jonbiro", icon: "github" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/jonathanbiro/", icon: "linkedin" },
      { label: "Resume", url: "https://www.kickresume.com/cv/biro-cv/", icon: "link" },
      { label: "Medium", url: "https://medium.com/@jonbiro", icon: "medium" },
      { label: "X", url: "https://x.com/JonathanBiro", icon: "x" },
      { label: "Email", url: "mailto:jonathan@biro.dev", icon: "mail" },
    ],
    impact: [
      {
        label: "Super Seerr suite",
        value: "36/36 passing",
        href: "https://github.com/jonbiro/super-seerr-extension/commit/49fca11",
      },
      { label: "External adapters", value: "7 + Seerr overlay", href: "#project-super-seerr" },
      { label: "Lighthouse", value: "99–100 perf", href: "#qualityDossier" },
    ],
  },

  about: {
    subtitle:
      "I came to quality engineering through full-stack development—and that changes how I test.",
    lead: "I can follow a failure across the browser, service, data, and CI layers, then improve testability at the source instead of adding another brittle check around the edge.",
    bullets: [
      "Based in Los Angeles and focused on QA automation, SDET work, and release confidence.",
      "Built products with React, Node.js, Ruby on Rails, TypeScript, and PostgreSQL before specializing in quality.",
      "A Flatiron School graduate with earlier experience across medical technology, retail, and IT support.",
      "Most interested in the seam between a useful test, a debuggable failure, and a confident release decision.",
    ],
    cards: [
      {
        title: "01 · Full-stack foundation",
        text: "Building front ends, services, and data-backed products taught me to debug across boundaries—not stop at the browser symptom.",
      },
      {
        title: "02 · Quality engineering focus",
        text: "UI, API, mobile, and CI automation organized around release risk, observable outcomes, and useful failure evidence.",
      },
      {
        title: "03 · Current chapter",
        text: "Designing calmer quality systems in Los Angeles: small smoke gates, explicit test data, and feedback teams can act on quickly.",
      },
    ],
  },

  skills: [
    {
      category: "Browser + Mobile",
      summary: "Exercise critical journeys with stable locators, reusable fixtures, and cross-browser evidence.",
      items: ["Playwright", "Selenium", "Cypress", "Appium"],
    },
    {
      category: "API + Data",
      summary: "Validate contracts, negative paths, and test data explicitly so failures have one understandable cause.",
      items: ["API testing", "SQL", "PostgreSQL", "Test data"],
    },
    {
      category: "Quality Systems",
      summary: "Turn coverage into a release decision through risk mapping, flake ownership, and clear evidence.",
      items: ["Test strategy", "Flake triage", "Risk-based testing", "Accessibility"],
    },
    {
      category: "Delivery",
      summary: "Keep feedback fast with focused gates, parallel execution, and artifacts attached when a build turns red.",
      items: ["GitHub Actions", "CI/CD", "Parallelization", "Failure artifacts"],
    },
    {
      category: "Engineering Context",
      summary: "Use the product’s own stack to diagnose defects and make the system easier to test.",
      items: ["TypeScript", "JavaScript", "Python", "Java", "Ruby", "React", "Node.js", "Rails"],
    },
  ],

  principles: [
    {
      number: "01",
      title: "Start with release risk",
      text: "Map the critical journeys, failure modes, and customer impact before choosing what to automate.",
      tags: ["Risk-based coverage", "Acceptance criteria", "Test strategy"],
    },
    {
      number: "02",
      title: "Make failures explain themselves",
      text: "A red build should arrive with enough context—logs, traces, screenshots, and clean test data—to make the next action obvious.",
      tags: ["Debuggability", "Artifacts", "Fast triage"],
    },
    {
      number: "03",
      title: "Engineer for the whole system",
      text: "Use full-stack context to improve testability at the source, not just add more checks around brittle behavior.",
      tags: ["Shift left", "Developer experience", "Quality by design"],
    },
  ],

  projects: [
    {
      name: "Super Seerr Extension",
      slug: "super-seerr",
      eyebrow: "Cross-browser extension",
      category: "Automation",
      description:
        "A Chrome and Firefox extension that connects Seerr with seven movie and TV platforms, adds rating overlays, watchlists, and bulk request flows.",
      highlights: ["Chrome + Firefox builds", "36/36 passing at commit 49fca11"],
      tags: ["JavaScript", "Browser Extension", "API", "Testing"],
      imageUrl: "assets/projects/super-seerr-card.webp",
      imageAlt: "Legacy Jellyseerr-branded Super Seerr availability panel and watch action on an IMDb title page.",
      visualLabel: "Legacy-branded extension screenshot on IMDb",
      gallery: [
        { src: "assets/projects/super-seerr-imdb.webp", alt: "Legacy Jellyseerr-branded Super Seerr flyout on an IMDb title page" },
        { src: "assets/projects/super-seerr-rt.webp", alt: "Legacy Jellyseerr-branded Super Seerr flyout on a Rotten Tomatoes title page" },
      ],
      links: { code: "https://github.com/jonbiro/super-seerr-extension", demo: "" },
      updatedAt: "2026-06-07",
      verifiedAt: "2026-08-30",
      featured: true,
      caseStudy: {
        label: "Test report 01",
        context:
          "One extension has to behave consistently across seven independently changing media sites while also enhancing Seerr itself.",
        risks: [
          "Site-specific DOM changes can break extraction and injection.",
          "Single-page navigation can duplicate overlays or leave stale state behind.",
          "Chrome and Firefox packaging can drift when platform details are duplicated.",
        ],
        strategy: [
          "Centralize shared behavior in reusable integration, API, ratings, and UI modules.",
          "Keep site-specific adapters small and explicit instead of hiding every difference behind one abstraction.",
          "Exercise migration, cache coalescing, idempotence, summary logic, overlay injection, and SPA navigation in the public test suite.",
        ],
        evidence: [
          { value: "7", label: "External site adapters" },
          {
            value: "36/36",
            label: "Passing at commit 49fca11",
            href: "https://github.com/jonbiro/super-seerr-extension/commit/49fca11",
          },
          { value: "2", label: "Browser builds" },
        ],
        owned:
          "The shared integration surface, explicit site adapters, browser packaging, and regression strategy behind the public build.",
        decision:
          "The key boundary is a shared quality surface plus explicit per-site adapters: reuse where behavior is stable, isolate where the web is not.",
        tradeoff:
          "Small adapter-level differences remain visible on purpose. A universal abstraction would look cleaner, but it would hide the exact DOM and navigation risks that change from site to site.",
        next:
          "Add captured DOM fixtures and scheduled browser smoke runs so upstream markup drift is detected before a user encounters it.",
        verification: {
          label: "Verified repository snapshot",
          status: "36 / 36 passed",
          command: "npm test",
          commit: "49fca11",
          commitUrl: "https://github.com/jonbiro/super-seerr-extension/commit/49fca11",
          checkedOn: "August 30, 2026",
          details: ["13 focused spec files", "0 failures", "Public repository"],
        },
        architecture: [
          {
            step: "01",
            title: "Site adapters",
            text: "Seven external site adapters isolate DOM extraction, theme, and single-page navigation, while the Seerr overlay owns the native product surface.",
            path: "src/content/*-integration.js",
          },
          {
            step: "02",
            title: "Shared model",
            text: "Reusable extraction, ratings, UI, and integration modules keep stable behavior in one tested boundary.",
            path: "src/shared/",
          },
          {
            step: "03",
            title: "API boundary",
            text: "A dedicated Seerr client and background worker own request, status, watchlist, settings, and migration behavior.",
            path: "src/shared/SeerrClient.js · src/background/",
          },
          {
            step: "04",
            title: "Regression safety",
            text: "Focused tests cover migration, cache coalescing, idempotence, ratings, overlays, watchlists, filtering, and SPA navigation.",
            path: "tests/*.test.js",
          },
        ],
      },
    },
    {
      name: "Interactive QA Portfolio",
      eyebrow: "You are here",
      category: "Automation",
      description:
        "A progressively enhanced portfolio with a command palette, on-demand GitHub pulse, accessible 3D toy, QA simulator, and flake-cost calculator.",
      highlights: ["Framework-free interface", "Accessibility + performance checks"],
      tags: ["JavaScript", "CSS", "Accessibility", "Portfolio"],
      imageUrl: "assets/projects/portfolio-preview.webp",
      imageAlt: "Yoni Biro QA automation portfolio share card.",
      visualLabel: "Portfolio release card",
      links: { code: "https://github.com/jonbiro/biro.dev", demo: "https://biro.dev/" },
      updatedAt: "2026-09-15",
      featured: false,
      caseStudy: {
        label: "Quality dossier",
        context:
          "A portfolio about software quality should demonstrate the same care it talks about, even when the page is playful and interaction-heavy.",
        risks: [
          "Motion can distract, obscure content, or ignore user preferences.",
          "Custom menus, dialogs, and toys can create keyboard or focus traps.",
          "Remote profile data and project links can fail independently of the page.",
        ],
        strategy: [
          "Keep the document useful before enhancement, then layer in motion, live data, and keyboard commands.",
          "Respect reduced-motion and fine-pointer capabilities, and pause expensive animation when it is not visible.",
          "Run content, HTML, production-runtime, accessibility, performance, SEO, and dependency checks before release.",
        ],
        evidence: [
          { value: "100", label: "Accessibility audit" },
          { value: "99–100", label: "Three-run performance range" },
          { value: "0", label: "Known package vulnerabilities" },
        ],
        owned:
          "The content model, progressive enhancement, accessible interaction states, responsive system, automated checks, and deployment evidence.",
        decision:
          "Delight stays optional. Content, navigation, contact, and project evidence remain available when motion is reduced or remote data is unavailable.",
        tradeoff:
          "Keeping the interface framework-free makes the core small and inspectable, while requiring extra care around custom dialog, menu, and focus behavior.",
        next:
          "Add scheduled visual-regression snapshots for the flagship card, evidence sheets, theme states, and the smallest supported viewport.",
      },
    },
    {
      name: "PWA Testing Lab",
      eyebrow: "Earlier QA experiment",
      category: "Automation",
      description: "A compact set of experiments around progressive web app behavior, resilience, and testability.",
      highlights: ["PWA behavior", "JavaScript test experiments"],
      tags: ["PWA", "Testing", "JavaScript"],
      links: { code: "https://github.com/jonbiro/PWA-testing", demo: "" },
      updatedAt: "2019-06-10",
      featured: false,
    },
    {
      name: "Travlr",
      eyebrow: "Full-stack product",
      category: "Apps",
      description:
        "An actively developed Next.js trip-planning app with authenticated AI itineraries, maps, weather, and PostgreSQL-backed features.",
      highlights: ["Next.js 16 + TypeScript", "Prisma + PostgreSQL"],
      tags: ["Next.js", "TypeScript", "Prisma", "PostgreSQL"],
      imageUrl: "assets/projects/travlr.webp",
      imageAlt: "Travlr itinerary planner login screen.",
      visualLabel: "Travlr product interface",
      links: { code: "https://github.com/jonbiro/Travlr---Itinerary-Planning", demo: "" },
      updatedAt: "2026-08-30",
      featured: false,
    },
    {
      name: "DogeQuest 1989",
      eyebrow: "Canvas game",
      category: "Play",
      description: "A neon puppy platformer with double jump, dash, coyote time, jump buffering, particles, and mobile support.",
      highlights: ["Playable in the browser", "Vanilla JavaScript + Canvas"],
      tags: ["Game", "Canvas", "JavaScript"],
      links: {
        code: "https://github.com/jonbiro/DogeQuest-1989",
        demo: "https://jonbiro.github.io/DogeQuest-1989/",
      },
      updatedAt: "2026-02-10",
      featured: false,
    },
  ],

  qualityDossier: {
    checkedAt: "2026-09-15",
    checkedOn: "September 15, 2026",
    summary: "This site ships with an evidence trail instead of a vague “built with care” claim.",
    metrics: [
      { value: "100", label: "Accessibility" },
      { value: "100", label: "Best practices" },
      { value: "100", label: "SEO" },
      { value: "99–100", label: "Three-run performance" },
    ],
    checks: [
      "Keyboard-accessible navigation, dialogs, project controls, and Quality Cube",
      "Reduced-motion behavior and off-screen animation pausing",
      "Production runtime smoke test and social-card asset verification",
      "Content, HTML, link, and dependency checks with zero known package vulnerabilities",
    ],
  },

  qaChallenges: [
    {
      question:
        "A UI test passes locally but fails in CI after navigation. The trace shows the target appears late. What is the best first fix?",
      choices: ["Add a three-second sleep", "Increase retries to three", "Wait for an observable ready state"],
      answer: 2,
      rationale:
        "Wait on the state the user actually needs. Fixed sleeps waste time and retries can hide the timing defect instead of removing it.",
    },
    {
      question: "Which locator best expresses the behavior a user performs?",
      choices: [".card:nth-child(3) button", "getByRole('button', { name: 'Submit request' })", "button.primary"],
      answer: 1,
      rationale:
        "A role-and-name locator follows the accessible action, survives layout changes, and catches regressions that also affect real users.",
    },
    {
      question: "A retry turns a red run green, but the same test flakes twice this week. What should the release signal say?",
      choices: ["Green—ignore it", "Block every release indefinitely", "Ship only if risk allows, then assign the flake"],
      answer: 2,
      rationale:
        "Retries can preserve flow, but they do not erase risk. Make the recovered flake visible, give it an owner, and decide using release impact.",
    },
  ],

  qaTips: [
    "Quarantine flaky tests fast, but always open a follow-up ticket with an owner.",
    "Write assertions against user outcomes, not implementation details.",
    "Attach traces and screenshots only on failure to keep CI artifacts useful and small.",
    "Treat test data like code: explicit setup, explicit teardown, no hidden coupling.",
    "Measure test feedback time weekly and make speed regressions visible to the team.",
    "A test that fails randomly is worse than no test until the root cause is fixed.",
    "Use stable, intentional selectors and document the selector contract with frontend teams.",
    "Keep smoke suites tiny and deterministic so deploy confidence stays high.",
  ],
};
