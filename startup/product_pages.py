"""Render future product pages from the portfolio's structured editorial content."""
from html import escape
from urllib.parse import quote

from site_parts import concept_list, status_pill


def render_product(item, portfolio, email):
    name = escape(item['name'])
    slug = item['slug']
    steps = ''.join(f'<li><h3>{escape(title)}</h3><p>{escape(body)}</p></li>' for title, body in item['workflow'])
    features = ''.join(f'<li>{escape(feature)}</li>' for feature in item['features'])
    faq = ''.join(f'<details><summary>{escape(question)}</summary><p>{escape(answer)}</p></details>' for question, answer in item['questions'])
    by_slug = {x['slug']: x for x in portfolio}
    flagship = {'slug': 'addvancedfocus', 'name': 'AddvancedFocus', 'category': 'Executive function & getting started', 'status': 'development'}
    related = concept_list([by_slug.get(other, flagship) for other in item['related']])
    email_href = 'mailto:' + escape(email, quote=True) + '?subject=' + quote(name + ' — product feedback')
    headline = '<br>'.join(escape(line) for line in item['headline'].split('<br>'))
    progress_note = (
        '<section class="section wrap product-development-note" aria-label="OpenCall development status">'
        '<p class="eyebrow">DEVELOPMENT STATUS</p>'
        '<h2>Native development is underway.</h2>'
        '<p>OpenCall has a separate native iOS project with implemented call and message protection features and local testing. '
        'That codebase is not a public App Store release. The accessible explanations on this page are a future product direction, not an active checker on this website.</p>'
        '<a class="text-link" href="https://github.com/jonbiro/OpenCall">See the native development repository</a>'
        '</section>'
    ) if slug == 'opencall' else ''
    when_available = (
        'OpenCall has native iOS development builds, but no public release of this accessibility-focused experience is announced. '
        'The functionality on this webpage is descriptive only; it does not accept or check calls or messages.'
        if slug == 'opencall' else
        f'{name} is in early concept development. There is no public release date, price, or supported-platform list yet. '
        'The next step is to develop and evaluate the intended experience.'
    )
    return f'''<section class="wrap future-product-hero">
<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/products/">Products</a><span aria-hidden="true">/</span><span aria-current="page">{name}</span></nav>
<div class="future-hero-grid"><div><p class="eyebrow">{name.upper()} · {escape(item['category']).upper()}</p><h1>{headline}</h1><p class="intro">{escape(item['description'])}</p><div class="actions"><a class="button" href="#approach">See how {name} could work</a><a class="text-link" href="{email_href}">Share your perspective</a></div></div>
<aside class="product-brief" aria-label="{name} overview"><div class="product-brief-head"><img class="app-icon" src="/assets/products/icons/{slug}.webp" alt="" width="56" height="56" decoding="async">{status_pill(item.get("status", "concept"))}</div><p class="product-brief-tagline">{escape(item['tagline'])}</p><dl><div><dt>Who it’s for</dt><dd>{escape(item['audience'])}</dd></div><div><dt>The goal</dt><dd>{escape(item['goal'])}</dd></div></dl></aside></div><nav class="page-contents" aria-label="On this product page"><a href="#approach">Intended workflow</a><a href="#capabilities">Planned capabilities</a><a href="#questions">Questions</a><a href="#feedback">Share feedback</a></nav></section>
{progress_note}<figure class="wrap app-mockup"><img src="/assets/products/{slug}.webp" alt="{name} concept interface and app icon. The planned workflow is described in the text below." width="1536" height="1024" loading="lazy" decoding="async"><figcaption><span>{name} · Interface and logo concept</span><span>Illustrative design. Not a released application.</span></figcaption></figure>
<section class="section wrap editorial-split"><div><p class="eyebrow">THE EVERYDAY CHALLENGE</p><h2>{name} starts<br>with a real need.</h2></div><div class="editorial-copy"><p class="large">{escape(item['problem'])}</p><p>{escape(item['goal'])}</p></div></section>
<section class="feature-section" id="approach" tabindex="-1"><div class="section wrap"><div class="section-intro"><p class="eyebrow">HOW IT COULD WORK</p><h2>A thoughtful path<br>through the moment.</h2><p>This walkthrough illustrates the intended experience. It describes the product direction, not functionality available on this website.</p></div><ol class="development-steps concept-steps">{steps}</ol></div></section>
<section class="section wrap product-detail-grid" id="capabilities" tabindex="-1"><div><p class="eyebrow">PLANNED CAPABILITIES</p><h2>The details<br>we’re exploring.</h2><ul class="capability-list">{features}</ul></div><aside class="product-example" aria-label="Illustrative {name} scenario"><p class="eyebrow">AN EVERYDAY EXAMPLE</p><h3>What support could look like.</h3><p class="large">{escape(item['example'])}</p><div class="example-boundary"><h4>A design consideration</h4><p>{escape(item['principle'])}</p></div></aside></section>
<section class="feature-section"><div class="section wrap editorial-split"><div><p class="eyebrow">ACCESSIBILITY &amp; CONTROL</p><h2>Designed around<br>the person using it.</h2></div><div class="editorial-copy"><p class="large">{escape(item['access'])}</p><p>Privacy, affordability, and user autonomy are shared Biro.dev design principles. Product-specific data practices, supported access methods, and any offline capabilities would be explained before public release.</p><a class="text-link" href="/mission/">Read our design commitments</a></div></div></section>
<section class="section wrap faq" id="questions" tabindex="-1"><p class="eyebrow">QUESTIONS ABOUT {name.upper()}</p><h2>A clearer picture.</h2>{faq}<details><summary>When can I use {name}?</summary><p>{when_available}</p></details></section>
<section class="wrap product-feedback" id="feedback" tabindex="-1"><div><p class="eyebrow">HELP INFORM THE DIRECTION</p><h2>What would make {name}<br>useful in your everyday life?</h2><p>Share a challenge, a useful detail, or a question. You do not need to share sensitive personal information.</p></div><a class="button" href="{email_href}">Email about {name}</a></section>
<section class="section wrap"><p class="eyebrow">RELATED PRODUCT DIRECTIONS</p><h2>Other parts of the picture.</h2>{related}<a class="text-link" href="/products/#future-products">View the full portfolio</a></section>'''
