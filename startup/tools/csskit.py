"""Parse, audit and restructure the Biro.dev stylesheet. Standard library only.

  python3 tools/csskit.py report <css> --html dist
  python3 tools/csskit.py check  <css> --html dist
"""
from __future__ import annotations

import argparse
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


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('command', choices=['report', 'check'])
    parser.add_argument('css', type=Path)
    parser.add_argument('--html', type=Path, required=True, help='generated site directory (dist)')
    args = parser.parse_args(argv)
    nodes = parse(args.css.read_text())
    is_used = load_usage(args.html)
    if args.command == 'report':
        print(report(nodes, is_used))
        return 0
    problems = check(nodes, is_used)
    print('\n'.join(problems) if problems else 'OK: stylesheet satisfies the Foundation rules.')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
