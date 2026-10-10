"""Shared page parts for generate.py: status labels, "Where things stand", founder profile links, and the redesign's hero, glance, concept-list and constellation markup."""
from html import escape
from urllib.parse import urlsplit

STATUS_LABELS = {'demo': 'Working demo', 'development': 'In development', 'concept': 'Concept'}
PROFILE_SERVICES = (('github', 'GitHub'), ('linkedin', 'LinkedIn'))
UNSAFE_URL_CHARACTERS = set(' "\'<>')


def status_pill(kind: str) -> str:
    return f'<span class="pill pill-{kind}">{STATUS_LABELS[kind]}</span>'


def _is_public_https_url(url: str) -> bool:
    """An https:// URL with a real host, and no credentials, whitespace, control characters or quotes."""
    if not url.startswith('https://') or UNSAFE_URL_CHARACTERS.intersection(url) or any(c.isspace() or ord(c) < 32 for c in url):
        return False
    parts = urlsplit(url)
    return parts.scheme == 'https' and '.' in (parts.hostname or '') and '@' not in parts.netloc


def profile_links(config: dict) -> list:
    """(label, url) for each configured profile whose URL is a plain https:// address, in a fixed order."""
    profiles = config.get('profiles') or {}
    if not isinstance(profiles, dict):
        return []
    links = []
    for key, label in PROFILE_SERVICES:
        url = str(profiles.get(key, '')).strip()
        if _is_public_https_url(url):
            links.append((label, url))
    return links


def render_profile_links(links: list, css_class: str, separator: str = ' ') -> str:
    return separator.join(f'<a class="{css_class}" href="{escape(url, quote=True)}" rel="me">{escape(label)}</a>'
                          for label, url in links)


def where_things_stand(variant: str) -> str:
    """The one "Where things stand" block: 'compact' for AddvancedFocus, 'strip' for Home, 'full' for Products."""
    if variant not in ('compact', 'full', 'strip'):
        raise ValueError(f'Unknown variant: {variant}')
    columns = (
        '<div class="readiness-grid">'
        f'<article>{status_pill("demo")}<h3>Built and working</h3><ul>'
        '<li>An interactive AddvancedFocus concept with three everyday situations and two energy levels</li>'
        '<li>Two- and five-minute sessions you can pause with a return note, stop without marking the step complete, or undo a completion</li>'
        '<li>This website and its accessibility statement</li></ul>'
        '<a class="text-link" href="/addvancedfocus/#concept-demo">Try the working demo</a></article>'
        f'<article>{status_pill("development")}<h3>What we’re building</h3><ul>'
        '<li>AI-assisted task initiation and planning</li><li>Flexible routines and household coordination</li>'
        '<li>Privacy, affordability, and user control</li></ul></article>'
        '<article><h3>Not yet decided</h3><ul><li>Public launch date</li><li>Pricing</li><li>Supported platforms</li>'
        '<li>AI provider</li><li>Data practices</li></ul><p class="micro">We’ll explain these before public release.</p></article>'
        '</div>'
    )
    if variant == 'full':
        after = (
            '<h3 class="where-stages">How we’re building it</h3><ol class="development-steps">'
            '<li><span class="pill">Current concept</span><h4>Make the interaction tangible</h4><p>Explore smaller starting points, flexible focus sessions, and a way back after interruptions through the interactive website prototype.</p></li>'
            '<li><span class="pill">Planned development</span><h4>Add useful intelligence</h4><p>Develop AI-assisted ways to turn everyday intentions into manageable actions, while keeping suggestions understandable and editable.</p></li>'
            '<li><span class="pill">Before public release</span><h4>Clarify the full experience</h4><p>Evaluate accessibility and reliability, define personal-data controls, and communicate supported platforms, pricing, and product limitations.</p></li>'
            '</ol><p class="micro">This is a statement of direction. Scope and sequencing may change as development progresses.</p>'
        )
    else:
        after = '<a class="text-link where-more" href="/products/#where-things-stand">See how we’re building it</a>'
    inner = ('<p class="eyebrow">WHERE THINGS STAND</p><h2 id="where-things-stand-title">AddvancedFocus: what’s here today.</h2>'
             + columns + after)
    if variant == 'strip':
        return ('<section class="readiness status-strip" id="where-things-stand" tabindex="-1" aria-labelledby="where-things-stand-title">'
                '<div class="wrap">' + inner + '</div></section>')
    return ('<section class="section wrap readiness" id="where-things-stand" tabindex="-1" aria-labelledby="where-things-stand-title">'
            + inner + '</section>')


def glance(rows: list) -> str:
    """The ruled "at a glance" column for inner-page heroes. Values are HTML (links, pills)."""
    items = ''.join(f'<div><dt>{escape(term)}</dt><dd>{value}</dd></div>' for term, value in rows)
    return f'<aside class="glance" aria-label="At a glance"><p class="eyebrow">AT A GLANCE</p><dl>{items}</dl></aside>'


def inner_hero(eyebrow: str, title_html: str, intro_html: str, aside: str = '', below: str = '') -> str:
    return (f'<section class="page-hero wrap"><div class="hero-grid"><div><p class="eyebrow">{eyebrow}</p>'
            f'<h1>{title_html}</h1><p class="intro">{intro_html}</p></div>{aside}</div>{below}</section>')


def concept_list(items: list, detailed: bool = False) -> str:
    """Ruled rows linking to each product page: icon, name, category and its status label."""
    rows = []
    for item in items:
        slug, name = item['slug'], escape(item['name'])
        icon = (f'<img class="app-icon" src="/assets/products/icons/{slug}.webp" alt="" width="56" height="56" '
                'loading="lazy" decoding="async">')
        tail = status_pill(item.get('status', 'concept')) + '<span class="concept-row-arrow" aria-hidden="true">→</span>'
        if detailed:
            text = (f'<span class="concept-row-text"><span class="eyebrow">{escape(item["category"])}</span>'
                    f'<h3 id="{slug}-title">{name}</h3><span class="concept-row-tagline">{escape(item["tagline"])}</span>'
                    f'<span class="concept-row-description">{escape(item["description"])}</span></span>')
            rows.append(f'<li id="{slug}" tabindex="-1"><a class="concept-row concept-row-detailed" href="/{slug}/" '
                        f'aria-labelledby="{slug}-title">{icon}{text}{tail}</a></li>')
        else:
            text = f'<span class="concept-row-text"><strong>{name}</strong><span>{escape(item["category"])}</span></span>'
            rows.append(f'<li><a class="concept-row" href="/{slug}/">{icon}{text}{tail}</a></li>')
    return '<ul class="concept-list" role="list">' + ''.join(rows) + '</ul>'


ORBIT = ('carebridge', 'storyready', 'clearcue', 'plainpath', 'stepable', 'sayable', 'sensoryscout', 'opencall')


def constellation(variant: str = 'home') -> str:
    """The decorative signature image: AddvancedFocus at the center, the eight concepts on a slowly drifting orbit."""
    if variant not in ('home', 'compact'):
        raise ValueError(f'Unknown constellation variant: {variant}')
    lazy = ' loading="lazy"' if variant == 'compact' else ''
    icons = [f'<img src="/assets/products/icons/{slug}.webp" alt="" width="112" height="112"{lazy} decoding="async">' for slug in ORBIT]
    css_class = 'constellation constellation-compact' if variant == 'compact' else 'constellation'
    return (f'<div class="{css_class}" aria-hidden="true"><span class="constellation-ring constellation-ring-outer"></span>'
            '<span class="constellation-ring constellation-ring-inner"></span>'
            f'<div class="constellation-orbit">{"".join(icons)}</div>'
            f'<img class="constellation-core" src="/assets/products/icons/addvancedfocus-af.svg" alt="" width="112" height="112"{lazy} decoding="async"></div>')
