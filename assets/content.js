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
      "QA Automation Engineer / SDET with full-stack roots, building UI, API, mobile, and CI automation that teams can actually trust.",
    links: [
      { label: "GitHub", url: "https://github.com/jonbiro", icon: "github" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/jonathanbiro/", icon: "linkedin" },
      { label: "Resume", url: "https://www.kickresume.com/cv/biro-cv/", icon: "link" },
      { label: "Medium", url: "https://medium.com/@jonbiro", icon: "medium" },
      { label: "X", url: "https://x.com/JonathanBiro", icon: "x" },
      { label: "Email", url: "mailto:jonathan@biro.dev", icon: "mail" },
    ],
    impact: [
      { label: "Automation", value: "UI • API • Mobile" },
      { label: "Release signal", value: "Fast + debuggable" },
      { label: "Home base", value: "Los Angeles" },
    ],
  },

  about: {
    subtitle:
      "QA Automation Engineer / SDET in Los Angeles with a full-stack background and a systems mindset.",
    lead: "I build automation teams can trust: readable tests, useful failure evidence, and fast feedback that keeps releases moving.",
    bullets: [
      "I test user outcomes instead of coupling suites to implementation details.",
      "I treat flaky tests as production bugs: isolate them quickly, diagnose the cause, and close the loop.",
      "My React, Node, and Rails background helps me debug across the browser, services, data, and CI layers.",
      "I’m a proud Flatiron School graduate who still enjoys shipping playful side projects.",
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
    { category: "Automation", items: ["Playwright", "Selenium", "Cypress", "Appium", "Jest", "pytest"] },
    { category: "Coverage", items: ["UI", "API", "Integration", "Mobile", "Accessibility", "Visual regression"] },
    { category: "Languages", items: ["TypeScript", "JavaScript", "Python", "Java", "Ruby", "SQL"] },
    { category: "Quality Systems", items: ["Test strategy", "Flake triage", "Reporting", "Release gates", "Risk-based testing"] },
    { category: "Delivery", items: ["GitHub Actions", "AWS", "CI/CD", "Parallelization", "Artifacts", "Observability"] },
    { category: "Full-Stack Roots", items: ["React", "Node.js", "Express", "Ruby on Rails", "PostgreSQL", "GraphQL"] },
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
      eyebrow: "Cross-browser extension",
      description:
        "A Chrome and Firefox extension that connects Seerr with seven movie and TV platforms, adds rating overlays, watchlists, and bulk request flows.",
      highlights: ["Chrome + Firefox builds", "33 automated regression tests"],
      tags: ["JavaScript", "Browser Extension", "API", "Testing"],
      links: { code: "https://github.com/jonbiro/super-seerr-extension", demo: "" },
      updatedAt: "2026-06-07",
      featured: true,
    },
    {
      name: "Interactive QA Portfolio",
      eyebrow: "You are here",
      description:
        "A motion-aware portfolio with a command palette, live GitHub pulse, accessible 3D toy, QA simulator, and flake-cost calculator.",
      highlights: ["Zero framework dependencies", "Accessibility + performance checks"],
      tags: ["JavaScript", "CSS", "Accessibility", "Portfolio"],
      links: { code: "", demo: "https://yonibiro.com/" },
      updatedAt: "2026-08-30",
      featured: true,
    },
    {
      name: "DogeQuest 1989",
      eyebrow: "Canvas game",
      description: "A playful puppy platformer built with vanilla JavaScript, HTML, CSS, and Canvas.",
      highlights: ["Playable in the browser", "No game framework"],
      tags: ["Game", "Canvas", "JavaScript"],
      links: {
        code: "https://github.com/jonbiro/DogeQuest-1989",
        demo: "https://jonbiro.github.io/DogeQuest-1989/",
      },
      updatedAt: "2026-02-10",
      featured: true,
    },
    {
      name: "Travlr",
      eyebrow: "Full-stack product",
      description: "A React and Ruby on Rails itinerary planner using location APIs and PostgreSQL.",
      highlights: ["React front end", "Rails API + PostgreSQL"],
      tags: ["React", "Rails", "TypeScript", "PostgreSQL"],
      links: { code: "https://github.com/jonbiro/Travlr---Itinerary-Planning", demo: "" },
      updatedAt: "2026-02-09",
      featured: false,
    },
    {
      name: "PWA Testing Lab",
      eyebrow: "Quality experiment",
      description: "A compact set of experiments around progressive web app behavior, resilience, and testability.",
      highlights: ["PWA behavior", "JavaScript test experiments"],
      tags: ["PWA", "Testing", "JavaScript"],
      links: { code: "https://github.com/jonbiro/PWA-testing", demo: "" },
      updatedAt: "2019-06-10",
      featured: false,
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
