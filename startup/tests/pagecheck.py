"""A minimal HTML tree for page tests, built with the standard library."""
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}


class Node:
    def __init__(self, tag, attrs, parent):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []

    @property
    def classes(self):
        return (self.attrs.get('class') or '').split()

    def text(self):
        return ' '.join(''.join(c if isinstance(c, str) else ' ' + c.text() + ' ' for c in self.children).split())

    def iter(self):
        for child in self.children:
            if isinstance(child, Node):
                yield child
                yield from child.iter()

    def strings(self):
        for child in self.children:
            if isinstance(child, str):
                yield child, self
            else:
                yield from child.strings()

    def find_all(self, tag=None, cls=None, id=None):
        return [n for n in self.iter() if (tag is None or n.tag == tag) and (cls is None or cls in n.classes)
                and (id is None or n.attrs.get('id') == id)]

    def find(self, **kwargs):
        found = self.find_all(**kwargs)
        return found[0] if found else None

    def ancestors(self):
        node = self
        while node is not None:
            yield node
            node = node.parent


class _Builder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = self.current = Node('#root', {}, None)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.current)
        self.current.children.append(node)
        if tag not in VOID:
            self.current = node

    def handle_startendtag(self, tag, attrs):
        self.current.children.append(Node(tag, attrs, self.current))

    def handle_endtag(self, tag):
        node = self.current
        while node is not self.root and node.tag != tag:
            node = node.parent
        if node is not self.root:
            self.current = node.parent

    def handle_data(self, data):
        self.current.children.append(data)


def parse(path) -> Node:
    builder = _Builder()
    builder.feed(Path(path).read_text())
    return builder.root


def page_path(route: str, dist=DIST) -> Path:
    if route == '/':
        return dist / 'index.html'
    if route.endswith('.html'):
        return dist / route.lstrip('/')
    return dist / route.strip('/') / 'index.html'


def load(route: str) -> Node:
    return parse(page_path(route))


def main_sections(root: Node) -> list:
    main = root.find(tag='main')
    return [c for c in main.children if isinstance(c, Node)]


ROUTES = ['/'] + sorted(f'/{p.parent.name}/' for p in DIST.glob('*/index.html')
                        if p.parent.name not in ('assets', 'focusflow')) + ['/404.html']
