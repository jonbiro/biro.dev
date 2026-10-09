"""Parse, audit and restructure the Biro.dev stylesheet. Standard library only.

  python3 tools/csskit.py report   <css> --html dist
  python3 tools/csskit.py check    <css> --html dist
  python3 tools/csskit.py prune    <in.css> <out.css> --html dist
  python3 tools/csskit.py tokenize <in.css> <out.css> --html dist
  python3 tools/csskit.py split    <in.css> --out-dir styles --html dist [--overlap index.json]
  python3 tools/csskit.py selectors <in.css> --html dist   (probe selectors for qa/selector-index.mjs)
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

COMMENT = re.compile(r'/\*.*?\*/', re.S)
IMPORTANT = re.compile(r'\s*!\s*important\s*$', re.I)
FUNCTIONAL_PSEUDO = re.compile(r':[a-zA-Z-]+\(')
CLASS = re.compile(r'\.(-?[_a-zA-Z][\w-]*)')
VAR_USE = re.compile(r'var\(\s*(--[\w-]+)')
ALLOWED_IMPORTANT = ('print', 'prefers-reduced-motion')


@dataclass
class Decl:
    prop: str
    value: str
    important: bool = False

    def render(self) -> str:
        return f"{self.prop}:{self.value}{'!important' if self.important else ''}"


@dataclass
class Rule:
    selector: str
    decls: list
    context: str = ''

    def render(self) -> str:
        return self.selector + '{' + ';'.join(d.render() for d in self.decls) + '}'


@dataclass
class Raw:
    """A block kept verbatim, such as @keyframes."""
    text: str
    context: str = ''

    def render(self) -> str:
        return self.text


def split_top_level(text: str, sep: str) -> list:
    parts, depth, quote, start = [], 0, '', 0
    for i, ch in enumerate(text):
        if quote:
            if ch == quote:
                quote = ''
        elif ch in '"\'':
            quote = ch
        elif ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        elif ch == sep and depth == 0:
            parts.append(text[start:i])
            start = i + 1
    parts.append(text[start:])
    return parts


def normalize_selector(text: str) -> str:
    return re.sub(r'\s*,\s*', ',', re.sub(r'\s+', ' ', text.strip()))


def normalize_context(text: str) -> str:
    text = re.sub(r'\s+', ' ', text.strip())
    text = re.sub(r'\(\s+', '(', text)
    text = re.sub(r'\s+\)', ')', text)
    text = re.sub(r'\s*:\s*', ':', text)
    text = re.sub(r'\s*,\s*', ',', text)
    return re.sub(r'^@media\s+\(', '@media(', text)


def parse_decls(block: str) -> list:
    decls = []
    for chunk in split_top_level(block, ';'):
        if not chunk.strip():
            continue
        if ':' not in chunk:
            raise ValueError(f'Unparseable declaration: {chunk!r}')
        prop, value = chunk.split(':', 1)
        prop = prop.strip()
        if not prop.startswith('--'):
            prop = prop.lower()
        value = value.strip()
        important = bool(IMPORTANT.search(value))
        value = IMPORTANT.sub('', value).strip()
        if '"' not in value and "'" not in value:
            value = re.sub(r'\s+', ' ', value)
        decls.append(Decl(prop, value, important))
    return decls


def _matching_brace(text: str, start: int) -> int:
    depth = 0
    for j in range(start, len(text)):
        if text[j] == '{':
            depth += 1
        elif text[j] == '}':
            depth -= 1
            if depth == 0:
                return j
    raise ValueError('Unbalanced braces')


def _parse_block(text: str, context: str) -> list:
    nodes, i = [], 0
    while i < len(text):
        brace = text.find('{', i)
        if brace == -1:
            if text[i:].strip():
                raise ValueError(f'Trailing content: {text[i:][:60]!r}')
            break
        prelude = text[i:brace].strip()
        if ';' in prelude:
            raise ValueError(f'Statement at-rules are not supported: {prelude[:60]!r}')
        end = _matching_brace(text, brace)
        body = text[brace + 1:end]
        if prelude.startswith(('@media', '@supports')):
            if context:
                raise ValueError('Nested conditional at-rules are not supported')
            nodes.extend(_parse_block(body, normalize_context(prelude)))
        elif prelude.startswith('@'):
            nodes.append(Raw(prelude + '{' + re.sub(r'\s+', ' ', body.strip()) + '}', context))
        else:
            nodes.append(Rule(normalize_selector(prelude), parse_decls(body), context))
        i = end + 1
    return nodes


def parse(text: str) -> list:
    return _parse_block(COMMENT.sub('', text), '')


def serialize(nodes: list) -> str:
    lines, current = [], ''
    for node in nodes:
        if isinstance(node, Rule) and not node.decls:
            continue
        if node.context != current:
            if current:
                lines.append('}')
            if node.context:
                lines.append(node.context + '{')
            current = node.context
        lines.append(('  ' if node.context else '') + node.render())
    if current:
        lines.append('}')
    return '\n'.join(lines) + '\n'


def strip_functional_pseudos(selector: str) -> str:
    out, i = [], 0
    while i < len(selector):
        match = FUNCTIONAL_PSEUDO.search(selector, i)
        if not match:
            out.append(selector[i:])
            break
        out.append(selector[i:match.start()])
        depth, j = 0, match.end() - 1
        while j < len(selector):
            if selector[j] == '(':
                depth += 1
            elif selector[j] == ')':
                depth -= 1
                if depth == 0:
                    break
            j += 1
        i = j + 1
    return ''.join(out)


def classes_outside_pseudos(selector: str) -> set:
    return set(CLASS.findall(strip_functional_pseudos(selector)))


# Classes a script builds at runtime (so the usage scan cannot see them), each with a comment naming where.
KEEP_CLASSES = set()


def load_usage(dist: Path):
    """Returns is_used(class_name): true if any generated page or site script references the class."""
    classes = set()
    for page in dist.rglob('*.html'):
        for value in re.findall(r'class="([^"]*)"', page.read_text()):
            classes.update(value.split())
    scripts = '\n'.join(p.read_text() for p in (dist / 'assets').rglob('*.js'))

    def is_used(name: str) -> bool:
        return name in KEEP_CLASSES or name in classes or re.search(r'(?<![\w-])' + re.escape(name) + r'(?![\w-])', scripts) is not None
    return is_used


def _where(context: str) -> str:
    return context or 'top level'


def _enforces_hidden(rule: Rule, decl: Decl) -> bool:
    """`[hidden]{display:none!important}` keeps the hidden attribute stronger than component display rules."""
    return decl.prop == 'display' and decl.value == 'none' and all(m.strip().endswith('[hidden]') for m in split_top_level(rule.selector, ','))


def check(nodes: list, is_used) -> list:
    problems = []
    rules = [n for n in nodes if isinstance(n, Rule)]
    counts = Counter((r.context, r.selector) for r in rules)
    for (context, selector), count in counts.items():
        if count > 1:
            problems.append(f'Duplicate rule: "{selector}" ({_where(context)}) appears {count} times')
    defined, used = set(), set()
    for rule in rules:
        for decl in rule.decls:
            if decl.prop.startswith('--'):
                defined.add(decl.prop)
            used.update(VAR_USE.findall(decl.value))
            if decl.important and not any(word in rule.context for word in ALLOWED_IMPORTANT) and not _enforces_hidden(rule, decl):
                problems.append(f'!important outside print/reduced motion: {rule.selector} {{ {decl.prop} }}')
        for member in split_top_level(rule.selector, ','):
            if not all(is_used(name) for name in classes_outside_pseudos(member)):
                problems.append(f'Dead selector: "{member}" ({_where(rule.context)})')
    problems += [f'Unused custom property: {p}' for p in sorted(defined - used)]
    problems += [f'Undefined custom property: {p}' for p in sorted(used - defined)]
    return problems


def report(nodes: list, is_used) -> str:
    rules = [n for n in nodes if isinstance(n, Rule)]
    colors = Counter(h.lower() for r in rules for d in r.decls for h in re.findall(r'#[0-9a-fA-F]{3,8}\b', d.value))
    contexts = Counter(r.context for r in rules if r.context)
    lines = [f'{len(rules)} rules, {sum(len(r.decls) for r in rules)} declarations',
             'Contexts: ' + ', '.join(f'{c} ×{n}' for c, n in contexts.most_common()),
             'Colors used 3+ times: ' + ', '.join(f'{c} ×{n}' for c, n in colors.most_common() if n >= 3)]
    lines += check(nodes, is_used)
    return '\n'.join(lines)


# Newer CSS features that may follow an older fallback value. Function names and units are matched as whole
# tokens, so minmax( does not count as max(.
FALLBACK_MARKERS = re.compile(r'(?<![\w-])(clamp|min|max|env|color-mix)\(|\d(dvh|svh|lvh|dvw|svw|lvw|cqw|cqh|cqi)\b|-webkit-|-moz-')

# Token table from the Foundation spec. Values are exact; the redesign normalizes them later.
COLOR_TOKENS = {
    '#090f1b': '--color-bg', '#0d1727': '--surface-1', '#101d30': '--surface-2', '#111d30': '--surface-3',
    '#142238': '--surface-4', '#14243a': '--surface-5', '#132640': '--surface-6',
    '#2b415e': '--border-1', '#304965': '--border-2', '#3b5576': '--border-3', '#415b7d': '--border-4', '#6685af': '--border-5',
    '#e7eef9': '--text', '#c1cfe0': '--text-quiet', '#acbad0': '--text-subtle',
    '#8bb6ff': '--accent', '#b4cfff': '--accent-text', '#c0d5f4': '--accent-text-soft', '#091321': '--on-accent',
    '#00000040': '--shadow-color',
}
RENAMED_VARS = {'--ink': '--text', '--muted': '--text-muted', '--blue': '--accent', '--line': '--border-line'}
# Tokens that @media(prefers-contrast:more) raises for people who ask for more contrast. Values are the defaults.
ADAPTIVE_TOKENS = {'--text-muted': '#acbad0', '--border-line': '#293b55'}
RADIUS_TOKENS = {'.75rem': '--radius-sm', '1rem': '--radius-md', '1.5rem': '--radius-lg', '24px': '--radius-lg-px', '100px': '--radius-pill'}
GAP_TOKENS = {'.5rem': '--space-2', '.75rem': '--space-3', '1rem': '--space-4', '1.25rem': '--space-5',
              '1.5rem': '--space-6', '2rem': '--space-8', '2.5rem': '--space-10', '4rem': '--space-16'}
BREAKPOINTS = {'(max-width:760px)': '(max-width:47.5rem)', '(min-width:761px)': '(min-width:47.5625rem)',
               '(max-width:1000px)': '(max-width:62.5rem)', '(max-width:440px)': '(max-width:27.5rem)'}
HEX = re.compile(r'#[0-9a-fA-F]{3,8}\b')


def prune_dead_selectors(nodes: list, is_used) -> tuple:
    out, removed = [], []
    for node in nodes:
        if isinstance(node, Rule):
            members = split_top_level(node.selector, ',')
            alive = [m for m in members if all(is_used(name) for name in classes_outside_pseudos(m))]
            removed += [m for m in members if m not in alive]
            if not alive:
                continue
            node = Rule(','.join(alive), node.decls, node.context)
        out.append(node)
    return out, removed


def _markers(value: str) -> set:
    return {match.group(0).lstrip('0123456789') for match in FALLBACK_MARKERS.finditer(value)}


def prune_overridden(nodes: list) -> tuple:
    """Drops a declaration when a later rule with the same selector sets the same property, in the same context or at
    the top level (which applies everywhere a conditional rule does)."""
    later = defaultdict(list)
    kept_reversed, removed = [], 0
    for node in reversed(nodes):
        if not isinstance(node, Rule):
            kept_reversed.append(node)
            continue
        key = (node.context, node.selector)
        decls = []
        for decl in node.decls:
            # A later top-level rule with the same selector also applies wherever a conditional rule does.
            candidates = later[(key, decl.prop)] + (later[(('', node.selector), decl.prop)] if node.context else [])
            overriding = [d for d in candidates if (d.important or not decl.important) and _markers(d.value) == _markers(decl.value)]
            if overriding:
                removed += 1
            else:
                decls.append(decl)
        for decl in node.decls:
            later[(key, decl.prop)].append(decl)
        kept_reversed.append(Rule(node.selector, decls, node.context))
    return list(reversed(kept_reversed)), removed


def tokenize(nodes: list) -> list:
    effective = {}
    for node in nodes:
        if isinstance(node, Rule) and node.selector == ':root' and not node.context:
            effective.update({d.prop: d.value.lower() for d in node.decls if d.prop.startswith('--')})
    used = {name for n in nodes if isinstance(n, Rule) for d in n.decls for name in VAR_USE.findall(d.value)}
    unknown = used - set(RENAMED_VARS)
    if unknown:
        raise ValueError(f'Custom properties without a token mapping: {sorted(unknown)}')
    token_values = {**{token: hex_value for hex_value, token in COLOR_TOKENS.items()}, **ADAPTIVE_TOKENS}
    for old, new in RENAMED_VARS.items():
        if old in used and effective.get(old) != token_values.get(new):
            raise ValueError(f'{old} resolves to {effective.get(old)}, but {new} is {token_values.get(new)}')

    def swap(decl: Decl) -> Decl:
        value = re.sub(r'var\(\s*(--[\w-]+)', lambda m: 'var(' + RENAMED_VARS.get(m.group(1), m.group(1)), decl.value)
        value = HEX.sub(lambda m: f'var({COLOR_TOKENS[m.group(0).lower()]})' if m.group(0).lower() in COLOR_TOKENS else m.group(0), value)
        if decl.prop == 'border-radius' and value in RADIUS_TOKENS:
            value = f'var({RADIUS_TOKENS[value]})'
        if decl.prop in ('gap', 'row-gap', 'column-gap') and value in GAP_TOKENS:
            value = f'var({GAP_TOKENS[value]})'
        return Decl(RENAMED_VARS.get(decl.prop, decl.prop), value, decl.important)

    root_settings, body = [], []
    for node in nodes:
        context = node.context
        for old, new in BREAKPOINTS.items():
            context = context.replace(old, new)
        if isinstance(node, Rule) and node.selector == ':root' and not node.context:
            root_settings += [d for d in node.decls if not d.prop.startswith('--')]
            continue
        if isinstance(node, Rule):
            body.append(Rule(node.selector, [swap(d) for d in node.decls], context))
        else:
            body.append(type(node)(node.text, context))
    tokens = [Decl(name, value) for value, name in COLOR_TOKENS.items()]
    tokens += [Decl(name, value) for name, value in ADAPTIVE_TOKENS.items()]
    tokens += [Decl(name, value) for value, name in RADIUS_TOKENS.items()]
    tokens += [Decl(name, value) for value, name in GAP_TOKENS.items()]
    return [Rule(':root', root_settings + tokens)] + body


STYLE_ORDER = [
    'tokens.css', 'base.css', 'layout.css',
    'components/header.css', 'components/footer.css', 'components/buttons.css', 'components/pills.css',
    'components/cards.css', 'components/faq.css', 'components/notice.css', 'components/closing.css',
    'components/readiness.css', 'components/page-nav.css', 'components/steps.css', 'components/app-icon.css',
    'components/app-mockup.css', 'components/concept-card.css', 'components/demo.css',
    'pages/home.css', 'pages/about.css', 'pages/products.css', 'pages/addvancedfocus.css',
    'pages/mission.css', 'pages/contact.css', 'pages/product-page.css', 'media.css',
]

# Class → file, from the class-usage map of the generated pages (2026-10-09).
_PARTITION_SOURCE = {
    'base.css': 'skip sr-only muted large intro micro eyebrow wide-copy divider',
    'layout.css': 'wrap section section-intro page-hero split feature-section editorial-split editorial-copy title-row',
    'components/header.css': 'header brand menu-toggle js-enabled open',
    'components/footer.css': 'footer footer-top footer-bottom footer-email',
    'components/buttons.css': 'button text-link actions',
    'components/pills.css': 'pill tags',
    'components/cards.css': 'cards card card-number',
    'components/faq.css': 'faq',
    'components/notice.css': 'notice',
    'components/closing.css': 'closing',
    'components/readiness.css': 'readiness-grid',
    'components/page-nav.css': 'page-contents breadcrumbs',
    'components/steps.css': 'development-steps',
    'components/app-icon.css': 'app-icon',
    'components/app-mockup.css': 'app-mockup',
    'components/concept-card.css': 'concept concept-top task task-meta af-mini-horizons',
    # .example is the old demo's scenario button. No page uses it, but the word appears in site.js prose,
    # so the conservative usage scan keeps it. Delete it in the visual redesign.
    'components/demo.css': 'example',
    'pages/home.css': 'hero hero-visual ribbon visual-caption principle-strip feature flow-list founder-teaser home-product-grid portfolio-teaser',
    'pages/about.css': 'founder-layout founder-panel monogram prose company-overview company-facts evaluation-list founder-contact',
    'pages/products.css': 'product-large product-art product-guide portfolio-card portfolio-detail portfolio-grid portfolio-image-link portfolio-index portfolio-page-link portfolio-tagline logo-family brand-family',
    'pages/addvancedfocus.css': 'af-product-hero af-product-promise focus-contexts horizon-guide concept-section concept-section-heading intent-example example-intention example-label approach-cards',
    'pages/mission.css': 'mission-image mission-statement privacy-note',
    'pages/contact.css': 'contact-address contact-card contact-layout contact-note contact-ready contact-stage contact-topics',
    'pages/product-page.css': 'future-product-hero future-hero-grid product-brief product-brief-head product-brief-tagline product-detail-grid product-example example-boundary capability-list product-feedback related-grid related-product',
}
PARTITION = {name: file for file, names in _PARTITION_SOURCE.items() for name in names.split()}
# Selector member, or (member, media context), → file, for rules that must sit later than their owner to keep
# today's cascade between equal-specificity rules in different files.
OWNER_OVERRIDES = {
    # The card heading's narrow-phone size must still beat `.product-large h2` (products.css), as it did before the split.
    ('.concept h2', '@media(max-width:24rem)'): 'pages/products.css',
    # The notice heading sits inside .section; keeping it in layout.css preserves its original order between the
    # .section and .editorial-split heading rules it competes with.
    '.notice h2': 'layout.css',
}
MEDIA_FILE_CONTEXTS = ('print', 'prefers-reduced-motion', 'prefers-contrast')

SIDES = ('top', 'right', 'bottom', 'left')
SHORTHAND_GROUPS = {
    'gap': {'row-gap', 'column-gap', 'grid-gap'}, 'grid-gap': {'row-gap', 'column-gap'},
    'inset': set(SIDES), 'place-items': {'align-items', 'justify-items'},
    'place-content': {'align-content', 'justify-content'}, 'place-self': {'align-self', 'justify-self'},
    'font': {'line-height'}, 'flex-flow': {'flex-direction', 'flex-wrap'},
    'border-radius': {'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'},
    'border-color': {f'border-{s}-color' for s in SIDES}, 'border-width': {f'border-{s}-width' for s in SIDES},
    'border-style': {f'border-{s}-style' for s in SIDES},
    'grid-area': {'grid-row-start', 'grid-row-end', 'grid-column-start', 'grid-column-end'},
    'grid-row': {'grid-row-start', 'grid-row-end'}, 'grid-column': {'grid-column-start', 'grid-column-end'},
}
# Logical properties (margin-inline, padding-block, inset-inline-start, …) map onto physical sides, so within these
# families a logical property is related to every other member.
LOGICAL_FAMILIES = {'margin', 'padding', 'border', 'inset', 'overflow', 'scroll-margin', 'scroll-padding'}


def related(a: str, b: str) -> bool:
    """True when one declaration of a could change the value another declaration of b sets on the same element."""
    if a == b or 'all' in (a, b):
        return True
    if a.startswith('--') or b.startswith('--'):
        return False
    if a.startswith(b + '-') or b.startswith(a + '-'):
        return True
    if any((a == s and b in longs) or (b == s and a in longs) for s, longs in SHORTHAND_GROUPS.items()):
        return True
    logical = any(part in ('inline', 'block') for part in a.split('-') + b.split('-'))
    return logical and a.split('-')[0] == b.split('-')[0] and a.split('-')[0] in LOGICAL_FAMILIES


def owner_file(member: str, context: str) -> str:
    if any(word in context for word in MEDIA_FILE_CONTEXTS):
        return 'media.css'
    if (member, context) in OWNER_OVERRIDES:
        return OWNER_OVERRIDES[(member, context)]
    if member in OWNER_OVERRIDES:
        return OWNER_OVERRIDES[member]
    if member == ':root':
        return 'tokens.css'
    stripped = strip_functional_pseudos(member)
    first_class = CLASS.search(stripped)
    if first_class:
        name = first_class.group(1)
        if name in PARTITION:
            return PARTITION[name]
        if name.startswith('af-'):
            return 'components/demo.css'
        raise KeyError(f'No partition for class .{name} (selector "{member}"). Add it to _PARTITION_SOURCE: '
                       'the page file if one page uses it, otherwise a components/ file.')
    first_id = re.search(r'#([\w-]+)', stripped)
    if first_id and first_id.group(1).startswith('af-'):
        return 'components/demo.css'
    return 'base.css'


JS_STATE_CLASSES = {'open'}
PSEUDO_ELEMENT = re.compile(r'::[a-zA-Z-]+(\([^()]*\))?')
SIMPLE_PSEUDO = re.compile(r':[a-zA-Z-]+')
ATTRIBUTE = re.compile(r'\[[^\]]*\]')
COMBINATOR = re.compile(r'(\s*[>+~]\s*|\s+)')


def probe_selector(member: str) -> str:
    """Over-approximates a selector: drops states, attributes, pseudo-elements and functional pseudo-classes, so the
    probe matches every element the selector could match in any state. Compounds left empty become `*`."""
    text = PSEUDO_ELEMENT.sub('', member)
    text = strip_functional_pseudos(text)
    text = ATTRIBUTE.sub('', text)
    text = SIMPLE_PSEUDO.sub('', text)
    for name in JS_STATE_CLASSES:
        text = re.sub(r'\.' + re.escape(name) + r'(?![\w-])', '', text)
    parts = COMBINATOR.split(text)
    return ''.join((' ' if not part.strip() else f' {part.strip()} ') if i % 2 else (part or '*') for i, part in enumerate(parts))


IDENT = re.compile(r'-?[_a-zA-Z][\w-]*')
LEGACY_PSEUDO_ELEMENTS = {'before', 'after', 'first-line', 'first-letter'}


def specificity(selector: str) -> tuple:
    """Selectors Level 4 specificity (ids, classes/attributes/pseudo-classes, types/pseudo-elements) of one
    complex selector. :is/:not/:has take their most specific argument; :where adds nothing."""
    ids = classes = types = 0
    i, n = 0, len(selector)
    while i < n:
        ch = selector[i]
        if ch in '#.':
            match = IDENT.match(selector, i + 1)
            ids, classes = (ids + 1, classes) if ch == '#' else (ids, classes + 1)
            i = match.end() if match else i + 1
        elif ch == '[':
            classes += 1
            i = selector.index(']', i) + 1
        elif ch == ':':
            element = selector.startswith('::', i)
            match = IDENT.match(selector, i + (2 if element else 1))
            name = match.group(0).lower() if match else ''
            i = match.end() if match else i + 1
            args = None
            if i < n and selector[i] == '(':
                depth, j = 0, i
                while j < n:
                    depth += selector[j] == '('
                    depth -= selector[j] == ')'
                    if depth == 0:
                        break
                    j += 1
                args, i = selector[i + 1:j], j + 1
            if element or name in LEGACY_PSEUDO_ELEMENTS:
                types += 1
            elif name in ('is', 'not', 'has') and args is not None:
                best = max(specificity(arg.strip()) for arg in split_top_level(args, ','))
                ids, classes, types = ids + best[0], classes + best[1], types + best[2]
            elif name != 'where':
                classes += 1
        elif IDENT.match(selector, i) and (i == 0 or selector[i - 1] in ' >+~('):
            types += 1
            i = IDENT.match(selector, i).end()
        else:
            i += 1
    return ids, classes, types


def _order_matters(a_selector: str, a_decl: Decl, b_selector: str, b_decl: Decl, overlaps) -> bool:
    """Whether swapping the order of two declarations could change a computed value."""
    if a_decl.prop == b_decl.prop and a_decl.value == b_decl.value:
        return False
    return (related(a_decl.prop, b_decl.prop) and a_decl.important == b_decl.important
            and specificity(a_selector) == specificity(b_selector)
            and (overlaps is None or overlaps(a_selector, b_selector)))


def load_overlaps(path: Path):
    """Returns overlaps(a, b) from a selector index ({member: [element keys]}). Unknown selectors always overlap."""
    index = {member: set(keys) for member, keys in json.loads(path.read_text()).items()}

    def overlaps(a: str, b: str) -> bool:
        if a not in index or b not in index:
            return True
        return not index[a].isdisjoint(index[b])
    return overlaps


def merge_duplicates(nodes: list, overlaps=None) -> list:
    """Folds earlier rules into the last rule with the same selector and context when no rule in between sets a
    related property on an element both selectors can match. Without an overlaps function, every pair may overlap."""
    nodes = [Rule(n.selector, list(n.decls), n.context) if isinstance(n, Rule) else n for n in nodes]
    positions = defaultdict(list)
    for index, node in enumerate(nodes):
        if isinstance(node, Rule):
            positions[(node.context, node.selector)].append(index)
    for indexes in positions.values():
        if len(indexes) < 2:
            continue
        last, moved = indexes[-1], []
        for index in indexes[:-1]:
            stay = []
            for decl in nodes[index].decls:
                between = [nodes[k] for k in range(index + 1, last) if isinstance(nodes[k], Rule)]
                if any(_order_matters(nodes[index].selector, decl, rule.selector, other, overlaps) for rule in between for other in rule.decls):
                    stay.append(decl)
                else:
                    moved.append(decl)
            nodes[index].decls = stay
        nodes[last].decls = moved + nodes[last].decls
    # Backward pass: fold what is still apart into the first rule, under the same safety rule.
    for indexes in positions.values():
        live = [i for i in indexes if nodes[i].decls]
        if len(live) < 2:
            continue
        first = live[0]
        for index in live[1:]:
            stay = []
            for decl in nodes[index].decls:
                between = [nodes[k] for k in range(first + 1, index) if isinstance(nodes[k], Rule)]
                blockers = [rule for rule in between
                            if any(_order_matters(nodes[index].selector, decl, rule.selector, other, overlaps) for other in rule.decls)]
                if not blockers:
                    nodes[first].decls.append(decl)
                elif not nodes[index].context and all(r.selector == nodes[index].selector and r.context for r in blockers):
                    # Hoist a top-level declaration past same-selector conditional rules by also appending it to each
                    # of them, so it still wins inside their conditions exactly as it did from its later position.
                    nodes[first].decls.append(decl)
                    for rule in blockers:
                        rule.decls.append(decl)
                else:
                    stay.append(decl)
            nodes[index].decls = stay
    return [n for n in nodes if not (isinstance(n, Rule) and not n.decls)]


def _redistribute(ordered: list, owners: dict, merged: list) -> dict:
    """Assigns merged nodes back to their files. A rule's file depends only on its selector, context and type, and
    merging only moves declarations into a later rule with the same selector and context, so membership is stable."""
    def key(node):
        return (type(node).__name__, node.context, node.selector if isinstance(node, Rule) else node.text)
    file_of = {key(node): owners[id(node)] for node in ordered}
    result = {name: [] for name in STYLE_ORDER}
    for node in merged:
        result[file_of[key(node)]].append(node)
    return {name: items for name, items in result.items() if items}


def split(nodes: list, overlaps=None) -> dict:
    files = defaultdict(list)
    for node in nodes:
        if isinstance(node, Raw):
            files['media.css' if any(w in node.context for w in MEDIA_FILE_CONTEXTS) else 'base.css'].append(node)
            continue
        for member in split_top_level(node.selector, ','):
            files[owner_file(member, node.context)].append(Rule(member, list(node.decls), node.context))
    unknown = set(files) - set(STYLE_ORDER)
    if unknown:
        raise KeyError(f'Files missing from STYLE_ORDER: {sorted(unknown)}')
    ordered = [n for name in STYLE_ORDER for n in files.get(name, [])]
    owners = {id(n): name for name in STYLE_ORDER for n in files.get(name, [])}
    # Prune first so merged rules do not carry declarations a later rule already overrides.
    pruned, _ = prune_overridden(ordered)
    owners.update({id(new): owners[id(old)] for old, new in zip(ordered, pruned)})
    return _redistribute(pruned, owners, merge_duplicates(pruned, overlaps))


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('command', choices=['report', 'check', 'prune', 'tokenize', 'split', 'selectors'])
    parser.add_argument('css', type=Path)
    parser.add_argument('out', type=Path, nargs='?')
    parser.add_argument('--html', type=Path, required=True, help='generated site directory (dist)')
    parser.add_argument('--out-dir', type=Path)
    parser.add_argument('--overlap', type=Path, help='selector index from qa/selector-index.mjs')
    args = parser.parse_args(argv)
    nodes = parse(args.css.read_text())
    is_used = load_usage(args.html)
    if args.command == 'report':
        print(report(nodes, is_used))
        return 0
    if args.command == 'check':
        problems = check(nodes, is_used)
        print('\n'.join(problems) if problems else 'OK: stylesheet satisfies the Foundation rules.')
        return 1 if problems else 0
    if args.command == 'selectors':
        members = {m for n in nodes if isinstance(n, Rule) for m in split_top_level(n.selector, ',')}
        print(json.dumps({m: probe_selector(m) for m in sorted(members)}, indent=1))
        return 0
    if args.command == 'split':
        if args.out_dir is None:
            parser.error('split needs --out-dir')
        files = split(nodes, load_overlaps(args.overlap) if args.overlap else None)
        for name, file_nodes in files.items():
            target = args.out_dir / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(serialize(file_nodes))
        print('STYLE_SOURCES = [')
        for name in files:
            print(f"    '{name}',")
        print(']')
        return 0
    if args.out is None:
        parser.error(f'{args.command} needs an output path')
    if args.command == 'prune':
        nodes, dead = prune_dead_selectors(nodes, is_used)
        nodes, overridden = prune_overridden(nodes)
        print(f'Removed {len(dead)} dead selectors and {overridden} overridden declarations.')
        for member in dead:
            print(f'  dead: {member}')
    else:
        nodes = tokenize(nodes)
        print('Tokenized colors, radii, gaps and breakpoints.')
    args.out.write_text(serialize(nodes))
    return 0

if __name__ == '__main__':
    sys.exit(main())
