import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import site_parts as sp  # noqa: E402


class StatusPill(unittest.TestCase):
    def test_the_three_labels(self):
        self.assertEqual(sp.status_pill('demo'), '<span class="pill pill-demo">Working demo</span>')
        self.assertEqual(sp.status_pill('development'), '<span class="pill pill-development">In development</span>')
        self.assertEqual(sp.status_pill('concept'), '<span class="pill pill-concept">Concept</span>')

    def test_unknown_kind_is_an_error(self):
        with self.assertRaises(KeyError):
            sp.status_pill('launched')


class ProfileLinks(unittest.TestCase):
    def test_only_valid_https_urls_render_in_a_fixed_order(self):
        config = {'profiles': {'linkedin': ' https://www.linkedin.com/in/example ', 'github': 'https://github.com/jonbiro'}}
        self.assertEqual(sp.profile_links(config), [('GitHub', 'https://github.com/jonbiro'),
                                                    ('LinkedIn', 'https://www.linkedin.com/in/example')])

    def test_empty_missing_or_unsafe_values_are_ignored(self):
        for value in ('', 'http://github.com/jonbiro', 'javascript:alert(1)', 'https://x.test/"onmouseover', 'https://a b',
                      'https://', 'https:///x', 'https://github.com/a\nb', 'https://user@github.com/x', 'https://localhost/x'):
            self.assertEqual(sp.profile_links({'profiles': {'github': value}}), [], value)
        self.assertEqual(sp.profile_links({}), [])

    def test_a_null_or_malformed_profiles_value_is_ignored(self):
        for profiles in (None, 'https://github.com/jonbiro', ['https://github.com/jonbiro']):
            self.assertEqual(sp.profile_links({'profiles': profiles}), [], repr(profiles))

    def test_rendered_links_name_the_service_and_use_rel_me(self):
        html = sp.render_profile_links([('GitHub', 'https://github.com/jonbiro?a=1&b=2')], 'text-link')
        self.assertEqual(html, '<a class="text-link" href="https://github.com/jonbiro?a=1&amp;b=2" rel="me">GitHub</a>')


class WhereThingsStand(unittest.TestCase):
    def test_compact_has_three_columns_and_links_to_the_full_version(self):
        html = sp.where_things_stand('compact')
        self.assertIn('id="where-things-stand"', html)
        self.assertEqual(html.count('<article>'), 3)
        for text in ('Working demo', 'In development', 'Not yet decided', 'Public launch date', 'Pricing',
                     'Supported platforms', 'AI provider', 'Data practices', 'href="/addvancedfocus/#concept-demo"',
                     'href="/products/#where-things-stand"'):
            self.assertIn(text, html)
        self.assertNotIn('development-steps', html)

    def test_undo_is_described_as_undoing_a_completion(self):
        self.assertIn('or undo a completion', sp.where_things_stand('compact'))

    def test_full_adds_the_three_development_stages_and_no_self_link(self):
        html = sp.where_things_stand('full')
        self.assertIn('<ol class="development-steps">', html)
        self.assertEqual(html.count('<li><span class="pill">'), 3)
        self.assertNotIn('href="/products/#where-things-stand"', html)

    def test_strip_has_the_compact_content_inside_a_full_width_band(self):
        strip, compact = sp.where_things_stand('strip'), sp.where_things_stand('compact')
        self.assertTrue(strip.startswith('<section class="readiness status-strip" id="where-things-stand"'))
        self.assertIn('<div class="wrap">', strip)
        inner = compact.split('>', 1)[1].rsplit('</section>', 1)[0]
        self.assertIn(inner, strip)

    def test_development_stages_are_headed(self):
        html = sp.where_things_stand('full')
        self.assertIn('<h3 class="where-stages">How we’re building it</h3>', html)
        self.assertEqual(html.count('<h4>'), 3)
        self.assertNotIn('<h3>Make the interaction tangible</h3>', html)

    def test_unknown_variant_is_an_error(self):
        with self.assertRaises(ValueError):
            sp.where_things_stand('tiny')


class Glance(unittest.TestCase):
    def test_rows_render_as_a_labelled_definition_list(self):
        html = sp.glance([('Company', 'Biro.dev'), ('Stage', sp.status_pill('development'))])
        self.assertEqual(html, '<aside class="glance" aria-label="At a glance"><p class="eyebrow">AT A GLANCE</p><dl>'
                               '<div><dt>Company</dt><dd>Biro.dev</dd></div>'
                               '<div><dt>Stage</dt><dd><span class="pill pill-development">In development</span></dd></div></dl></aside>')

    def test_terms_are_escaped(self):
        self.assertIn('<dt>A &amp; B</dt>', sp.glance([('A & B', 'x')]))


class InnerHero(unittest.TestCase):
    def test_headline_intro_aside_and_below(self):
        html = sp.inner_hero('ABOUT', 'Human needs.', 'Intro.', aside='<aside>x</aside>', below='<nav>y</nav>')
        self.assertEqual(html, '<section class="page-hero wrap"><div class="hero-grid"><div><p class="eyebrow">ABOUT</p>'
                               '<h1>Human needs.</h1><p class="intro">Intro.</p></div><aside>x</aside></div><nav>y</nav></section>')


ITEMS = [{'slug': 'carebridge', 'name': 'CareBridge', 'category': 'Family care coordination',
          'tagline': 'Less paperwork. More progress.', 'description': 'An AI family assistant.'},
         {'slug': 'addvancedfocus', 'name': 'AddvancedFocus', 'category': 'Executive function & getting started', 'status': 'development'}]


class ConceptList(unittest.TestCase):
    def test_compact_rows_link_with_icon_name_category_and_status(self):
        html = sp.concept_list(ITEMS)
        self.assertTrue(html.startswith('<ul class="concept-list" role="list">'))
        self.assertIn('<a class="concept-row" href="/carebridge/"><img class="app-icon" src="/assets/products/icons/carebridge.webp" alt=""', html)
        self.assertIn('<strong>CareBridge</strong><span>Family care coordination</span>', html)
        self.assertIn('<span class="pill pill-concept">Concept</span>', html)
        self.assertIn('<span class="pill pill-development">In development</span>', html)
        self.assertIn('Executive function &amp; getting started', html)
        self.assertEqual(html.count('aria-hidden="true">→</span>'), 2)

    def test_detailed_rows_keep_anchor_ids_heading_tagline_and_description(self):
        html = sp.concept_list(ITEMS[:1], detailed=True)
        self.assertIn('<li id="carebridge" tabindex="-1"><a class="concept-row concept-row-detailed" href="/carebridge/" aria-labelledby="carebridge-title">', html)
        self.assertIn('<h3 id="carebridge-title">CareBridge</h3>', html)
        self.assertIn('<span class="concept-row-tagline">Less paperwork. More progress.</span>', html)
        self.assertIn('<span class="concept-row-description">An AI family assistant.</span>', html)


class Constellation(unittest.TestCase):
    def test_decorative_orbit_of_eight_concepts_around_the_flagship(self):
        html = sp.constellation('home')
        self.assertTrue(html.startswith('<div class="constellation" aria-hidden="true">'))
        self.assertEqual(html.count('<img'), 9)
        self.assertEqual(html.count('alt=""'), 9)
        self.assertIn('class="constellation-core" src="/assets/products/icons/addvancedfocus.webp"', html)
        for slug in sp.ORBIT:
            self.assertIn(f'/assets/products/icons/{slug}.webp', html)
        self.assertNotIn('loading="lazy"', html)
        self.assertNotIn('style=', html)  # positions live in constellation.css, not inline styles

    def test_compact_variant_is_lazy_and_marked(self):
        html = sp.constellation('compact')
        self.assertIn('class="constellation constellation-compact"', html)
        self.assertEqual(html.count('loading="lazy"'), 9)

    def test_unknown_variant_is_an_error(self):
        with self.assertRaises(ValueError):
            sp.constellation('huge')


if __name__ == '__main__':
    unittest.main()
