import re
import sys
import unittest
from pathlib import Path

from pagecheck import ROOT

sys.path.insert(0, str(ROOT / 'tools'))
import csskit as ck  # noqa: E402

STYLES = ROOT / 'styles'
EXPECTED_TOKENS = {
    '--bg', '--surface-1', '--surface-2', '--surface-3', '--glow', '--line-subtle', '--line', '--line-strong',
    '--line-contrast', '--text', '--text-soft', '--text-muted', '--accent', '--accent-strong', '--on-accent',
    '--accent-tint', '--accent-tint-line', '--shadow',
    '--type-display', '--type-h2', '--type-h3', '--type-lead', '--type-body', '--type-ui', '--type-small', '--type-eyebrow',
    '--radius-sm', '--radius-md', '--radius-lg', '--radius-pill',
    *[f'--space-{n}' for n in range(1, 11)],
    '--motion-fast', '--motion-slow', '--motion-drift', '--ease',
}
HEX = re.compile(r'#[0-9a-fA-F]{3,8}\b')


def rules(path):
    return [n for n in ck.parse(path.read_text()) if isinstance(n, ck.Rule)]


class Tokens(unittest.TestCase):
    def test_tokens_css_defines_exactly_the_spec_tokens(self):
        root = [r for r in rules(STYLES / 'tokens.css') if r.selector == ':root' and not r.context]
        self.assertEqual(len(root), 1)
        self.assertEqual({d.prop for d in root[0].decls if d.prop.startswith('--')}, EXPECTED_TOKENS)

    def test_no_custom_property_is_defined_outside_tokens_css(self):
        for path in STYLES.rglob('*.css'):
            if path.name != 'tokens.css':
                defined = [d.prop for r in rules(path) for d in r.decls if d.prop.startswith('--')]
                self.assertEqual(defined, [], path.name)

    def test_no_hex_color_outside_tokens_css(self):
        for path in STYLES.rglob('*.css'):
            if path.name != 'tokens.css':
                found = [f'{r.selector} {{ {d.prop}: {d.value} }}' for r in rules(path) for d in r.decls if HEX.search(d.value)]
                self.assertEqual(found, [], path.relative_to(STYLES).as_posix())

    def test_font_size_budget(self):
        css = (ROOT / 'dist/assets/site.css').read_text()
        sizes = {d.value for r in ck.parse(css) if isinstance(r, ck.Rule) for d in r.decls if d.prop == 'font-size'}
        self.assertLessEqual(len(sizes), 12, sorted(sizes))

    def test_generator_and_csskit_list_the_same_partials(self):
        text = (ROOT / 'generate.py').read_text()
        sources = re.findall(r"^    '([^']+\.css)',$", re.search(r"STYLE_SOURCES = \[\n(.*?)\n\]", text, re.S).group(1), re.M)
        self.assertEqual(sources, ck.STYLE_ORDER)


class HeadingBreaks(unittest.TestCase):
    def test_breaks_in_headings_get_a_preceding_space(self):
        sys.path.insert(0, str(ROOT))
        from heading_breaks import heading_breaks
        html = '<h1>Life is complex.<br>Support should<br>feel <em>simple.</em></h1><p>a<br>b</p><h2 class="x">One.<br>Two.</h2>'
        self.assertEqual(heading_breaks(html), '<h1>Life is complex. <br>Support should <br>feel <em>simple.</em></h1>'
                                               '<p>a<br>b</p><h2 class="x">One. <br>Two.</h2>')

    def test_generated_headings_never_join_words_when_breaks_are_hidden(self):
        for path in (ROOT / 'dist').rglob('*.html'):
            for heading in re.findall(r'<h[12][^>]*>.*?</h[12]>', path.read_text(), re.S):
                self.assertNotRegex(heading, r'\S<br>', path.relative_to(ROOT / 'dist').as_posix())
