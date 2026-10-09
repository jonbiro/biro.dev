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


if __name__ == '__main__':
    unittest.main()
