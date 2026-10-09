import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from pagecheck import DIST, ROOT, ROUTES, load, page_path, parse

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
                         ['AI-POWERED ASSISTIVE TECHNOLOGY', 'WHY WE’RE HERE', 'OUR FIRST PRODUCT', 'WHERE THINGS STAND',
                          'HOW WE BUILD', 'BEYOND THE FLAGSHIP', 'FOUNDED WITH PURPOSE'])

    def test_hero_leads_with_the_working_demo(self):
        hero = self.sections[0]
        button = hero.find(cls='button')
        self.assertEqual((button.text(), button.attrs['href']), ('Try the working demo', '/addvancedfocus/#concept-demo'))
        self.assertIn('Meet AddvancedFocus', [a.text() for a in hero.find_all(cls='text-link')])
        self.assertIn('Biro.dev is building affordable, accessible software for neurodivergent people', hero.text())
        self.assertEqual(hero.find(cls='micro').text(), 'Founded in Los Angeles by Jonathan Biro · Pre-release')

    def test_concept_card_has_no_status_pill_and_links_to_the_demo(self):
        card = self.root.find(cls='concept')
        self.assertIsNone(card.find(cls='pill'))
        self.assertIn('Try the working demo', card.text())

    def test_flagship_section_uses_the_status_pill_without_small_print(self):
        feature = self.sections[2]
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

    def test_concept_cards_are_compact(self):
        cards = self.root.find_all(cls='portfolio-card')
        self.assertEqual(len(cards), 8)
        for card in cards:
            self.assertIsNotNone(card.find(cls='app-icon'), card.attrs['id'])
            self.assertEqual([p.text() for p in card.find_all(cls='pill')], ['Concept'], card.attrs['id'])
            self.assertIsNone(card.find(tag='details'), card.attrs['id'])

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


if __name__ == '__main__':
    unittest.main()
