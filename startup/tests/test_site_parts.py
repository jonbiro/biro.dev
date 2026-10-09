import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import site_parts as sp  # noqa: E402


class StatusPill(unittest.TestCase):
    def test_the_three_labels(self):
        self.assertEqual(sp.status_pill('demo'), '<span class="pill">Working demo</span>')
        self.assertEqual(sp.status_pill('development'), '<span class="pill">In development</span>')
        self.assertEqual(sp.status_pill('concept'), '<span class="pill">Concept</span>')

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

    def test_unknown_variant_is_an_error(self):
        with self.assertRaises(ValueError):
            sp.where_things_stand('tiny')


if __name__ == '__main__':
    unittest.main()
