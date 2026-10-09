"""Shared page parts for generate.py: status labels, the "Where things stand" block, and founder profile links."""
from html import escape

STATUS_LABELS = {'demo': 'Working demo', 'development': 'In development', 'concept': 'Concept'}
PROFILE_SERVICES = (('github', 'GitHub'), ('linkedin', 'LinkedIn'))
UNSAFE_URL_CHARACTERS = set(' "\'<>')


def status_pill(kind: str) -> str:
    return f'<span class="pill">{STATUS_LABELS[kind]}</span>'


def profile_links(config: dict) -> list:
    """(label, url) for each configured profile whose URL is a plain https:// address, in a fixed order."""
    profiles = config.get('profiles', {})
    links = []
    for key, label in PROFILE_SERVICES:
        url = str(profiles.get(key, '')).strip()
        if url.startswith('https://') and not UNSAFE_URL_CHARACTERS.intersection(url):
            links.append((label, url))
    return links


def render_profile_links(links: list, css_class: str, separator: str = ' ') -> str:
    return separator.join(f'<a class="{css_class}" href="{escape(url, quote=True)}" rel="me">{escape(label)}</a>'
                          for label, url in links)


def where_things_stand(variant: str) -> str:
    """The one "Where things stand" block: 'compact' for Home and AddvancedFocus, 'full' for Products."""
    if variant not in ('compact', 'full'):
        raise ValueError(f'Unknown variant: {variant}')
    columns = (
        '<div class="readiness-grid">'
        f'<article>{status_pill("demo")}<h3>Built and working</h3><ul>'
        '<li>An interactive AddvancedFocus concept with three everyday situations and two energy levels</li>'
        '<li>Two- and five-minute sessions you can pause with a return note, stop without marking the step complete, or undo</li>'
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
            '<p class="eyebrow where-stages">HOW WE’RE BUILDING IT</p><ol class="development-steps">'
            '<li><span class="pill">Current concept</span><h3>Make the interaction tangible</h3><p>Explore smaller starting points, flexible focus sessions, and a way back after interruptions through the interactive website prototype.</p></li>'
            '<li><span class="pill">Planned development</span><h3>Add useful intelligence</h3><p>Develop AI-assisted ways to turn everyday intentions into manageable actions, while keeping suggestions understandable and editable.</p></li>'
            '<li><span class="pill">Before public release</span><h3>Clarify the full experience</h3><p>Evaluate accessibility and reliability, define personal-data controls, and communicate supported platforms, pricing, and product limitations.</p></li>'
            '</ol><p class="micro">This is a statement of direction. Scope and sequencing may change as development progresses.</p>'
        )
    else:
        after = '<a class="text-link where-more" href="/products/#where-things-stand">See how we’re building it</a>'
    return ('<section class="section wrap readiness" id="where-things-stand" tabindex="-1" aria-labelledby="where-things-stand-title">'
            '<p class="eyebrow">WHERE THINGS STAND</p><h2 id="where-things-stand-title">AddvancedFocus: what’s here today.</h2>'
            + columns + after + '</section>')
