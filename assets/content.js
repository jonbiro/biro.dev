export const content = {
  person: {
    name: "Yoni Biro",
    fullName: "Jonathan Biro",
    role: "QA Automation Engineer / SDET",
    location: "Los Angeles, CA",
    email: "jonathan@biro.dev",
    headshotUrl: "https://avatars.githubusercontent.com/u/35150204?v=4&size=192",
    resumeUrl: "https://www.kickresume.com/cv/biro-cv/",
    availability: "Building calmer, more trustworthy release pipelines in Los Angeles.",
    headline: "I turn flaky test suites into fast, trustworthy release signals.",
    subheadline:
      "I build UI, API, and CI automation with readable tests, useful failure evidence, and fast feedback—from Los Angeles.",
    links: [
      { label: "GitHub", url: "https://github.com/jonbiro", icon: "github" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/jonathanbiro/", icon: "linkedin" },
      { label: "Resume", url: "https://www.kickresume.com/cv/biro-cv/", icon: "link" },
      { label: "Medium", url: "https://medium.com/@jonbiro", icon: "medium" },
      { label: "X", url: "https://x.com/JonathanBiro", icon: "x" },
      { label: "Email", url: "mailto:jonathan@biro.dev", icon: "mail" },
    ],
    impact: [
      { label: "Current public suite", value: "36/36 passing" },
      { label: "Cross-browser", value: "Chrome + Firefox" },
      { label: "Connected sites", value: "7 platforms" },
    ],
  },

  about: {
    subtitle:
      "QA Automation Engineer / SDET in Los Angeles with a full-stack background and a systems mindset.",
    lead: "I design automation around release risk: critical user journeys, explicit test data, fast feedback, and failures that tell the next person what to do.",
    bullets: [
      "Start with risk: map critical journeys and failure modes before choosing what to automate.",
      "Make red builds useful: attach the logs, traces, screenshots, and data needed to act.",
      "Use full-stack context to improve testability across browser, services, data, and CI.",
      "Keep smoke suites small and deterministic; grow coverage where it improves release decisions.",
    ],
    cards: [
      {
        title: "UI + Mobile Automation",
        text: "Stable selectors, reusable fixtures, cross-browser coverage, and maintainable flows with Playwright, Selenium, Cypress, and Appium.",
      },
      {
        title: "API + Integration",
        text: "Contract-aware API coverage, explicit test data, useful logs, and checks that fail for one understandable reason.",
      },
      {
        title: "CI Quality Systems",
        text: "Parallel suites, sensible retries, failure artifacts, and quality gates that turn a red build into a quick decision.",
      },
    ],
  },

  skills: [
    { category: "Automation", items: ["Playwright", "Selenium", "Cypress", "Appium"] },
    { category: "Languages", items: ["TypeScript", "JavaScript", "Python", "Java", "Ruby", "SQL"] },
    { category: "Quality Systems", items: ["UI + API coverage", "Test strategy", "Flake triage", "Risk-based testing"] },
    { category: "Delivery", items: ["GitHub Actions", "CI/CD", "Parallelization", "Failure artifacts"] },
    { category: "Full-Stack Context", items: ["React", "Node.js", "Ruby on Rails", "PostgreSQL"] },
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
      highlights: ["Chrome + Firefox builds", "36/36 passing at the public repository’s current HEAD"],
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
          { value: "7", label: "Connected media sites" },
          { value: "36/36", label: "Passing at public repo HEAD" },
          { value: "2", label: "Browser builds" },
        ],
        decision:
          "The key boundary is a shared quality surface plus explicit per-site adapters: reuse where behavior is stable, isolate where the web is not.",
      },
    },
    {
      name: "Interactive QA Portfolio",
      eyebrow: "You are here",
      category: "Automation",
      description:
        "A progressively enhanced portfolio with a command palette, live GitHub pulse, accessible 3D toy, QA simulator, and flake-cost calculator.",
      highlights: ["Framework-free interface", "Accessibility + performance checks"],
      tags: ["JavaScript", "CSS", "Accessibility", "Portfolio"],
      imageUrl: "assets/projects/portfolio-preview.webp",
      imageAlt: "Yoni Biro QA automation portfolio share card.",
      visualLabel: "Portfolio release card",
      links: { code: "", demo: "https://yoni-biro.jonnybrx.chatgpt.site/" },
      updatedAt: "2026-08-30",
      featured: true,
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
        decision:
          "Delight stays optional. Content, navigation, contact, and project evidence remain available when motion is reduced or remote data is unavailable.",
      },
    },
    {
      name: "PWA Testing Lab",
      eyebrow: "Quality experiment",
      category: "Automation",
      description: "A compact set of experiments around progressive web app behavior, resilience, and testability.",
      highlights: ["PWA behavior", "JavaScript test experiments"],
      tags: ["PWA", "Testing", "JavaScript"],
      links: { code: "https://github.com/jonbiro/PWA-testing", demo: "" },
      updatedAt: "2019-06-10",
      featured: true,
    },
    {
      name: "Travlr",
      eyebrow: "Full-stack product",
      category: "Apps",
      description: "A React and Ruby on Rails itinerary planner using location APIs and PostgreSQL.",
      highlights: ["React front end", "Rails API + PostgreSQL"],
      tags: ["React", "Rails", "TypeScript", "PostgreSQL"],
      imageUrl: "assets/projects/travlr.webp",
      imageAlt: "Travlr itinerary planner login screen.",
      visualLabel: "Travlr product interface",
      links: { code: "https://github.com/jonbiro/Travlr---Itinerary-Planning", demo: "" },
      updatedAt: "2026-02-09",
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
    checkedAt: "2026-08-30",
    checkedOn: "August 30, 2026",
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
