import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from pagecheck import DIST, ROOT, ROUTES, load, main_sections, page_path, parse

GITHUB = 'https://github.com/jonbiro'
STATUS_LINE = 'Biro.dev is pre-release. Concepts and artwork are illustrative, not released apps.'


def profile_hrefs(node):
    return [a.attrs.get('href') for a in node.find_all(tag='a') if a.attrs.get('rel') == 'me']


class FooterAndProfiles(unittest.TestCase):
    def test_every_footer_has_the_status_line_and_the_github_profile(self):
        for route in ROUTES:
            footer = load(route).find(tag='footer')
            self.assertIn(STATUS_LINE, footer.text(), route)
            self.assertEqual(profile_hrefs(footer), [GITHUB], route)
            self.assertNotIn('Products in development', footer.text(), route)

    def test_about_and_contact_link_the_founder_profile(self):
        for route, container in (('/about/', 'founder-panel'), ('/contact/', 'contact-card')):
            self.assertEqual(profile_hrefs(load(route).find(cls=container)), [GITHUB], route)

    def test_no_linkedin_link_while_it_is_not_configured(self):
        for route in ROUTES:
            self.assertNotIn('linkedin', page_path(route).read_text().lower(), route)

    def test_a_configured_linkedin_appears_in_all_three_places(self):
        with tempfile.TemporaryDirectory() as tmp:
            config = json.loads((ROOT / 'site-config.json').read_text())
            config['profiles']['linkedin'] = 'https://www.linkedin.com/in/example'
            config_path = Path(tmp) / 'site-config.json'
            config_path.write_text(json.dumps(config))
            out = Path(tmp) / 'out'
            env = {**os.environ, 'BIRO_SITE_CONFIG': str(config_path), 'BIRO_SITE_OUT': str(out)}
            subprocess.run([sys.executable, str(ROOT / 'generate.py')], env=env, check=True, capture_output=True)
            for route, container in (('/', None), ('/about/', 'founder-panel'), ('/contact/', 'contact-card')):
                root = parse(page_path(route, out))
                node = root.find(tag='footer') if container is None else root.find(cls=container)
                self.assertEqual(profile_hrefs(node), [GITHUB, 'https://www.linkedin.com/in/example'], route)


def first_eyebrow(node):
    eyebrow = node.find(cls='eyebrow')
    return eyebrow.text() if eyebrow else None


class Home(unittest.TestCase):
    def setUp(self):
        from pagecheck import main_sections
        self.root = load('/')
        self.sections = main_sections(self.root)

    def test_seven_sections_in_the_reviewer_order(self):
        self.assertEqual([first_eyebrow(s) for s in self.sections],
                         ['AI-POWERED ASSISTIVE TECHNOLOGY', 'WHERE THINGS STAND', 'WHY WE’RE HERE', 'OUR FIRST PRODUCT',
                          'HOW WE BUILD', 'BEYOND THE FLAGSHIP', 'FOUNDED WITH PURPOSE'])

    def test_hero_leads_with_the_working_demo(self):
        hero = self.sections[0]
        button = hero.find(cls='button')
        self.assertEqual((button.text(), button.attrs['href']), ('Try the working demo', '/addvancedfocus/#concept-demo'))
        self.assertIn('Meet AddvancedFocus', [a.text() for a in hero.find_all(cls='text-link')])
        self.assertIn('Biro.dev is building affordable, accessible software for neurodivergent people', hero.text())
        self.assertEqual(hero.find(cls='micro').text(), 'Founded in Los Angeles by Jonathan Biro · Pre-release')

    def test_hero_shows_the_decorative_constellation(self):
        hero = self.sections[0]
        figure = hero.find(cls='constellation')
        self.assertEqual(figure.attrs.get('aria-hidden'), 'true')
        self.assertEqual(len(figure.find_all(tag='img')), 9)
        self.assertIsNone(self.root.find(cls='concept'))
        self.assertIsNone(self.root.find(cls='hero-visual'))

    def test_status_strip_sits_directly_under_the_hero(self):
        strip = self.sections[1] if 'status-strip' in self.sections[1].classes else None
        self.assertIsNotNone(strip)
        self.assertEqual(strip.attrs.get('id'), 'where-things-stand')

    def test_family_section_lists_every_concept_with_its_status(self):
        rows = self.sections[5].find_all(cls='concept-row')
        self.assertEqual(len(rows), 8)
        for row in rows:
            self.assertEqual([p.text() for p in row.find_all(cls='pill')], ['Concept'])
            self.assertIsNotNone(row.find(cls='app-icon'))

    def test_flagship_section_uses_the_status_pill_without_small_print(self):
        feature = self.sections[3]
        self.assertEqual([p.text() for p in feature.find_all(cls='pill')], ['In development'])
        self.assertIsNone(feature.find(cls='micro'))

    def test_how_we_build_has_four_true_proof_points(self):
        section = self.sections[4]
        self.assertEqual(len(section.find_all(cls='card')), 4)
        text = section.text()
        self.assertIn('This website has no sign-up, live AI request, analytics script, or marketing cookie.', text)
        self.assertIn('stop a session without marking the step complete', text)
        hrefs = [a.attrs.get('href') for a in section.find_all(tag='a')]
        self.assertIn('/accessibility/', hrefs)
        self.assertIn('/mission/', hrefs)

    def test_teaser_and_founder_close(self):
        teaser, close = self.sections[5], self.sections[6]
        self.assertIn('Early concepts, each with its own page.', teaser.text())
        self.assertIsNone(teaser.find(cls='micro'))
        self.assertIn('Biro.dev was founded by Jonathan Biro in Los Angeles.', close.text())
        self.assertEqual(profile_hrefs(close), [GITHUB])
        self.assertEqual(close.find(cls='button').text(), 'Talk with the founder')

    def test_removed_sections_are_gone(self):
        for cls in ('principle-strip', 'founder-teaser'):
            self.assertIsNone(self.root.find(cls=cls), cls)


class Products(unittest.TestCase):
    def setUp(self):
        from pagecheck import main_sections
        self.root = load('/products/')
        self.sections = main_sections(self.root)

    def test_seven_parts_in_order(self):
        self.assertIn('page-hero', self.sections[0].classes)
        self.assertEqual([s.attrs.get('id') for s in self.sections[1:7]],
                         ['flagship', 'where-things-stand', 'product-guide', 'future-products', 'connected-vision', 'portfolio-questions'])
        self.assertIn('closing', self.sections[7].classes)
        self.assertEqual(len(self.sections), 8)

    def test_on_page_menu_matches_the_sections(self):
        nav = self.root.find(cls='page-contents')
        self.assertEqual([a.attrs['href'] for a in nav.find_all(tag='a')],
                         ['#flagship', '#where-things-stand', '#product-guide', '#future-products', '#portfolio-questions'])

    def test_flagship_status_and_demo_button(self):
        flagship = self.root.find(id='flagship')
        self.assertEqual([p.text() for p in flagship.find_all(cls='pill')], ['Working demo', 'In development'])
        button = flagship.find(cls='button')
        self.assertEqual((button.text(), button.attrs['href']), ('Try the working demo', '/addvancedfocus/#concept-demo'))
        self.assertEqual(flagship.find(cls='micro').text(), 'Illustrative concept.')

    def test_full_status_block_has_the_development_stages(self):
        block = self.root.find(id='where-things-stand')
        self.assertEqual(len(block.find(cls='development-steps').find_all(tag='li')), 3)

    def test_concepts_are_ruled_rows_with_status(self):
        rows = self.root.find(id='future-products').find_all(cls='concept-row')
        self.assertEqual(len(rows), 8)
        for row in rows:
            self.assertIsNotNone(row.find(cls='app-icon'))
            self.assertEqual([p.text() for p in row.find_all(cls='pill')], ['Concept'])
            self.assertIsNone(row.find(tag='details'))
        index = [a.attrs['href'][1:] for a in self.root.find(cls='portfolio-index').find_all(tag='a')]
        for slug in index:
            self.assertIsNotNone(self.root.find(id=slug), slug)

    def test_hero_has_the_compact_constellation(self):
        hero = self.sections[0]
        self.assertIsNotNone(hero.find(cls='hero-grid'))
        self.assertIn('constellation-compact', hero.find(cls='constellation').classes)

    def test_connected_vision_holds_the_logo_family(self):
        vision = self.root.find(id='connected-vision')
        self.assertIsNotNone(vision.find(cls='logo-family'))
        self.assertIsNone(vision.find(cls='micro'))

    def test_faq_keeps_only_unanswered_questions(self):
        faq = self.root.find(id='portfolio-questions')
        self.assertEqual([s.text() for s in faq.find_all(tag='summary')],
                         ['How are you deciding what to build first?', 'Can I help shape a product?'])

    def test_word_budget_and_removed_sections(self):
        self.assertLess(len(self.root.find(tag='main').text().split()), 1200)
        for cls in ('notice', 'brand-family'):
            self.assertIsNone(self.root.find(cls=cls), cls)
        self.assertIsNone(self.root.find(id='development'))
        self.assertIsNone(self.root.find(cls='product-guide').find(cls='micro'))


PRODUCT_SLUGS = ['carebridge', 'storyready', 'clearcue', 'plainpath', 'stepable', 'sayable', 'sensoryscout', 'opencall']


class AddvancedFocusPage(unittest.TestCase):
    def setUp(self):
        from pagecheck import main_sections
        self.root = load('/addvancedfocus/')
        self.sections = main_sections(self.root)

    def test_demo_comes_right_after_the_hero(self):
        self.assertIn('af-product-hero', self.sections[0].classes)
        self.assertEqual(self.sections[1].attrs.get('id'), 'concept-demo')
        self.assertIn('app-mockup', self.sections[2].classes)

    def test_status_pills(self):
        hero_pills = [p.text() for p in self.sections[0].find_all(cls='pill')]
        self.assertEqual(hero_pills, ['In development'])
        heading = self.root.find(cls='concept-section-heading')
        self.assertEqual([p.text() for p in heading.find_all(cls='pill')], ['Working demo'])

    def test_status_block_replaces_two_faq_answers(self):
        ids = [s.attrs.get('id') for s in self.sections]
        faq = next(s for s in self.sections if 'faq' in s.classes)
        self.assertLess(ids.index('where-things-stand'), self.sections.index(faq))
        self.assertEqual([s.text() for s in faq.find_all(tag='summary')],
                         ['Who is it being designed for?', 'How will personal information be handled?', 'Is AddvancedFocus a medical product?'])

    def test_mockup_caption_points_to_the_demo_without_a_direction(self):
        caption = self.root.find(cls='app-mockup').find(tag='figcaption')
        self.assertNotIn('below', caption.text())
        self.assertIn('#concept-demo', [a.attrs.get('href') for a in caption.find_all(tag='a')])

    def test_duplicate_small_print_is_gone(self):
        text = self.root.find(tag='main').text()
        self.assertNotIn('A working illustration of the idea', text)
        self.assertNotIn('The final AI implementation and data practices will be explained', text)
        self.assertEqual(self.sections[0].find(cls='button').text(), 'Try the working demo')


class ProductPages(unittest.TestCase):
    def test_each_product_page_uses_the_concept_status(self):
        portfolio = {item['slug']: item for item in json.loads((ROOT / 'portfolio.json').read_text())}
        for slug in PRODUCT_SLUGS:
            root = load(f'/{slug}/')
            brief = root.find(cls='product-brief')
            self.assertEqual([p.text() for p in brief.find_all(cls='pill')], ['Concept'], slug)
            self.assertIsNone(brief.find(cls='micro'), slug)
            self.assertIn('Not a released application', root.find(tag='figcaption').text(), slug)
            summaries = [s.text() for s in root.find(id='questions').find_all(tag='summary')]
            self.assertIn(f'When can I use {portfolio[slug]["name"]}?', summaries, slug)


    def test_related_products_are_concept_rows_with_their_status(self):
        for slug in PRODUCT_SLUGS:
            rows = load(f'/{slug}/').find_all(cls='concept-row')
            self.assertGreaterEqual(len(rows), 2, slug)
            for row in rows:
                pills = [p.text() for p in row.find_all(cls='pill')]
                self.assertIn(pills, (['Concept'], ['In development']), slug)

PHRASES = ('not a released', 'not yet publicly available', 'release timing', 'have not been announced', 'pre-release')


def allowed_context(route, node):
    chain = list(node.ancestors())
    if route == '/accessibility/':
        return True
    if any(n.tag in ('figcaption', 'footer') or n.attrs.get('id') in ('where-things-stand', 'privacy') for n in chain):
        return True
    return route == '/' and 'micro' in node.classes and any('hero' in n.classes for n in chain)


class Sitewide(unittest.TestCase):
    def test_status_phrases_appear_only_in_allowed_places(self):
        offenders = []
        for route in ROUTES:
            body = load(route).find(tag='body')
            for text, parent in body.strings():
                lowered = text.lower()
                if any(phrase in lowered for phrase in PHRASES) and not allowed_context(route, parent):
                    offenders.append(f'{route}: {" ".join(text.split())[:90]}')
        self.assertEqual(offenders, [])

    def test_undecided_items_are_not_repeated_outside_the_status_block(self):
        for route in ['/'] + [f'/{slug}/' for slug in PRODUCT_SLUGS]:
            text = load(route).find(tag='main').text()
            for phrase in ('Pricing has not been set', 'are still being decided'):
                self.assertNotIn(phrase, text, route)

    def test_every_fragment_link_resolves(self):
        broken = []
        for route in ROUTES:
            root = load(route)
            for a in root.find_all(tag='a'):
                href = a.attrs.get('href', '')
                if '#' not in href or not (href.startswith('/') or href.startswith('#')):
                    continue
                target, fragment = href.split('#', 1)
                page = root if not target else load(target)
                if fragment and page.find(id=fragment) is None:
                    broken.append(f'{route} → {href}')
        self.assertEqual(broken, [])

    def test_mission_keeps_the_shared_connected_vision_section(self):
        root = load('/mission/')
        vision = root.find(id='connected-vision')
        self.assertIsNotNone(vision)
        self.assertIn('Useful on its own.', vision.text())
        self.assertIsNone(vision.find(cls='logo-family'))
        self.assertIsNotNone(root.find(id='privacy'))

    def test_contact_stage_points_to_where_things_stand(self):
        stage = load('/contact/').find(cls='contact-stage')
        self.assertEqual([p.text() for p in stage.find_all(cls='pill')], ['In development'])
        self.assertIn('/products/#where-things-stand', [a.attrs.get('href') for a in stage.find_all(tag='a')])

    def test_about_shows_how_the_work_is_checked(self):
        sections = main_sections(load('/about/'))
        ids = [s.attrs.get('id') for s in sections]
        self.assertIn('how-the-work-is-checked', ids)
        index = ids.index('how-the-work-is-checked')
        self.assertIn('founder-layout', sections[index - 1].classes)
        section = sections[index]
        self.assertEqual(section.attrs.get('aria-labelledby'), 'how-checked-title')
        self.assertEqual(section.find(tag='h2').attrs.get('id'), 'how-checked-title')
        cards = section.find_all(cls='card')
        self.assertEqual([c.find(tag='h3').text() for c in cards],
                         ['A demo you can operate', 'Tested in more than one browser', 'Nothing tracked', 'Status without spin'])
        self.assertEqual([[a.attrs['href'] for a in c.find_all(tag='a')] for c in cards],
                         [['/addvancedfocus/#concept-demo'], ['/accessibility/'], ['/mission/#privacy'], ['/products/#where-things-stand']])
        text = section.text()
        copy = text.replace('WCAG 2.2', '')  # the standard's name, not a count
        for number in section.find_all(cls='card-number'):
            copy = copy.replace(number.text(), '', 1)  # decorative card numbering
        self.assertNotRegex(copy, r'\d', 'no counts or versions that go stale')
        for banned in ('every change', 'continuous', 'github'):
            self.assertNotIn(banned, text.lower())

    def test_home_how_we_build_links_to_the_checks(self):
        section = load('/').find(id='how-we-build')
        self.assertIn('/about/#how-the-work-is-checked', [a.attrs.get('href') for a in section.find_all(tag='a')])

    def test_inner_pages_have_an_at_a_glance_column(self):
        expected = {'/about/': ['Company', 'Founder', 'Based in', 'First product', 'Stage'],
                    '/mission/': ['Design target', 'Commitments', 'This website'],
                    '/contact/': ['Email', 'Founder', 'Based in'],
                    '/accessibility/': ['Target', 'Reviewed', 'Tested in', 'Not yet verified']}
        for route, terms in expected.items():
            column = load(route).find(cls='page-hero').find(cls='glance')
            self.assertIsNotNone(column, route)
            self.assertEqual([dt.text() for dt in column.find_all(tag='dt')], terms, route)
        stage = load('/about/').find(cls='glance').find_all(tag='dd')[-1]
        self.assertEqual(stage.text(), 'In development')
        self.assertIsNone(load('/about/').find(cls='company-overview'))

    def test_accessibility_statement_describes_the_current_checks(self):
        text = load('/accessibility/').find(tag='main').text()
        self.assertRegex(text, r'Reviewed (January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}')
        self.assertIn('Performed in Chromium and WebKit using automated (axe) and keyboard checks.', text)


if __name__ == '__main__':
    unittest.main()
