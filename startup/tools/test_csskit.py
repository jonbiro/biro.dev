import unittest

import csskit as ck


class ParseSerialize(unittest.TestCase):
    def test_round_trip_keeps_rules_contexts_importance_and_keyframes(self):
        source = ('/* layer */ .a , .b > c { color : red ; margin:0 !important }\n'
                  '@media (max-width: 47.5rem) { .a{color:blue} }\n'
                  '@keyframes enter{from{opacity:0}to{opacity:1}}')
        nodes = ck.parse(source)
        self.assertEqual([type(n).__name__ for n in nodes], ['Rule', 'Rule', 'Raw'])
        self.assertEqual(nodes[0].selector, '.a,.b > c')
        self.assertEqual([(d.prop, d.value, d.important) for d in nodes[0].decls], [('color', 'red', False), ('margin', '0', True)])
        self.assertEqual(nodes[1].context, '@media(max-width:47.5rem)')
        self.assertEqual(ck.serialize(nodes), (
            '.a,.b > c{color:red;margin:0!important}\n'
            '@media(max-width:47.5rem){\n'
            '  .a{color:blue}\n'
            '}\n'
            '@keyframes enter{from{opacity:0}to{opacity:1}}\n'))

    def test_adjacent_rules_in_the_same_context_share_one_block(self):
        nodes = ck.parse('@media print{.a{color:red}}@media print{.b{color:red}}')
        self.assertEqual(ck.serialize(nodes), '@media print{\n  .a{color:red}\n  .b{color:red}\n}\n')

    def test_media_query_words_keep_their_spaces(self):
        node = ck.parse('@media screen and (min-width: 30rem){.a{color:red}}')[0]
        self.assertEqual(node.context, '@media screen and (min-width:30rem)')

    def test_custom_property_names_keep_their_case(self):
        decl = ck.parse(':root{--Brand-Blue:#fff}')[0].decls[0]
        self.assertEqual(decl.prop, '--Brand-Blue')

    def test_nested_conditional_rules_are_rejected(self):
        with self.assertRaises(ValueError):
            ck.parse('@media print{@media (min-width:1px){.a{color:red}}}')


class Selectors(unittest.TestCase):
    def test_split_top_level_ignores_commas_inside_parentheses(self):
        self.assertEqual(ck.split_top_level(':is(.a,.b) p,.c', ','), [':is(.a,.b) p', '.c'])

    def test_classes_inside_functional_pseudos_are_ignored(self):
        self.assertEqual(ck.classes_outside_pseudos('.cards:has(.card:nth-child(4)) .x:not(.y)'), {'cards', 'x'})


class Check(unittest.TestCase):
    def is_used(self, name):
        return name in {'a', 'b'}

    def test_clean_stylesheet_has_no_problems(self):
        nodes = ck.parse(':root{--x:red;color-scheme:dark}.a{color:var(--x)}@media print{.b{color:red!important}}')
        self.assertEqual(ck.check(nodes, self.is_used), [])

    def test_hidden_attribute_enforcement_may_use_important(self):
        nodes = ck.parse('.a [hidden],[hidden]{display:none!important}.a{display:flex}')
        self.assertEqual(ck.check(nodes, self.is_used), [])

    def test_each_rule_of_the_spec_is_enforced(self):
        nodes = ck.parse(':root{--x:red;--unused:1px}:root{--y:blue}'
                         '.a{color:var(--x);margin:0!important}.a{padding:0;color:var(--y)}'
                         '.zombie{color:red}.b .x{border-color:var(--missing)}')
        problems = ck.check(nodes, self.is_used)
        self.assertIn('Duplicate rule: ":root" (top level) appears 2 times', problems)
        self.assertIn('Duplicate rule: ".a" (top level) appears 2 times', problems)
        self.assertIn('Unused custom property: --unused', problems)
        self.assertIn('Undefined custom property: --missing', problems)
        self.assertIn('!important outside print/reduced motion: .a { margin }', problems)
        self.assertIn('Dead selector: ".zombie" (top level)', problems)
        self.assertIn('Dead selector: ".b .x" (top level)', problems)


class PruneDeadSelectors(unittest.TestCase):
    def is_used(self, name):
        return name in {'live', 'cards'}

    def run_prune(self, css):
        nodes, removed = ck.prune_dead_selectors(ck.parse(css), self.is_used)
        return ck.serialize(nodes), removed

    def test_rule_with_only_unused_classes_is_removed(self):
        out, removed = self.run_prune('.gone{color:red}.live{color:blue}')
        self.assertEqual(out, '.live{color:blue}\n')
        self.assertEqual(removed, ['.gone'])

    def test_only_the_dead_members_of_a_selector_list_are_removed(self):
        out, _ = self.run_prune('.gone,.live p{color:red}')
        self.assertEqual(out, '.live p{color:red}\n')

    def test_classes_inside_not_and_has_never_make_a_selector_dead(self):
        out, removed = self.run_prune('p:not(.gone){color:red}.cards:has(.gone){gap:1px}')
        self.assertEqual(out, 'p:not(.gone){color:red}\n.cards:has(.gone){gap:1px}\n')
        self.assertEqual(removed, [])


class PruneOverridden(unittest.TestCase):
    def run_prune(self, css):
        nodes, count = ck.prune_overridden(ck.parse(css))
        return ck.serialize(nodes), count

    def test_earlier_declaration_overridden_by_same_selector_is_removed(self):
        out, count = self.run_prune('.a{color:red;margin:0}.b{color:green}.a{color:blue}')
        self.assertEqual(out, '.a{margin:0}\n.b{color:green}\n.a{color:blue}\n')
        self.assertEqual(count, 1)

    def test_important_declaration_survives_a_later_normal_one(self):
        out, count = self.run_prune('@media print{.a{color:red!important}.a{color:blue}}')
        self.assertEqual(count, 0)

    def test_different_contexts_do_not_override_each_other(self):
        _, count = self.run_prune('.a{color:red}@media print{.a{color:blue}}')
        self.assertEqual(count, 0)

    def test_progressive_fallbacks_are_kept(self):
        _, count = self.run_prune('.a{min-height:100vh}.a{min-height:100dvh}')
        self.assertEqual(count, 0)

    def test_duplicates_inside_one_rule_are_kept(self):
        _, count = self.run_prune('.a{display:block;display:grid}')
        self.assertEqual(count, 0)


class Tokenize(unittest.TestCase):
    def test_colors_vars_radii_gaps_and_breakpoints_are_tokenized(self):
        css = (':root{color-scheme:dark;--ink:#e7eef9;--muted:#d2def0;--blue:#8bb6ff;--line:#6685af;--pale:#101d30}'
               '.a{color:var(--ink);background:#101D30;border:1px solid #304965;border-radius:1rem;gap:1.5rem;'
               'box-shadow:0 0 4px #00000040;outline-color:var(--blue);border-color:var(--line);fill:var(--muted)}'
               '@media(max-width:760px){.a{gap:10px}}')
        out = ck.serialize(ck.tokenize(ck.parse(css)))
        root, rest = out.split('\n', 1)
        self.assertTrue(root.startswith(':root{color-scheme:dark;--color-bg:#090f1b;'))
        for token in ('--text:#e7eef9', '--text-muted:#d2def0', '--accent:#8bb6ff', '--border-5:#6685af', '--space-6:1.5rem'):
            self.assertIn(token, root)
        for removed in ('--ink', '--pale', '--muted:', '--blue', '--line'):
            self.assertNotIn(removed, root)
        self.assertEqual(rest, (
            '.a{color:var(--text);background:var(--surface-2);border:1px solid var(--border-2);'
            'border-radius:var(--radius-md);gap:var(--space-6);box-shadow:0 0 4px var(--shadow-color);'
            'outline-color:var(--accent);border-color:var(--border-5);fill:var(--text-muted)}\n'
            '@media(max-width:47.5rem){\n  .a{gap:10px}\n}\n'))

    def test_effective_values_of_renamed_properties_must_match_the_token_table(self):
        with self.assertRaises(ValueError):
            ck.tokenize(ck.parse(':root{--muted:#acbad0}.a{color:var(--muted)}'))


class Related(unittest.TestCase):
    def test_shorthands_longhands_and_box_families_are_related(self):
        for a, b in [('padding', 'padding-top'), ('gap', 'row-gap'), ('border-radius', 'border-top-left-radius'),
                     ('margin-inline', 'margin-left'), ('font', 'line-height'), ('color', 'color')]:
            self.assertTrue(ck.related(a, b), (a, b))
            self.assertTrue(ck.related(b, a), (b, a))

    def test_unrelated_properties(self):
        for a, b in [('color', 'background-color'), ('display', 'gap'), ('--a', '--b')]:
            self.assertFalse(ck.related(a, b), (a, b))


class Merge(unittest.TestCase):
    def test_earlier_rule_folds_into_the_last_one_when_nothing_between_conflicts(self):
        nodes = ck.merge_duplicates(ck.parse('.a{color:red}.b{margin:0}.a{padding:0}'))
        self.assertEqual(ck.serialize(nodes), '.b{margin:0}\n.a{color:red;padding:0}\n')

    def test_declaration_stays_when_a_rule_between_sets_a_related_property(self):
        nodes = ck.merge_duplicates(ck.parse('.a{color:red;padding:1px}.b{padding-top:2px}.a{margin:0}'))
        self.assertEqual(ck.serialize(nodes), '.a{padding:1px}\n.b{padding-top:2px}\n.a{color:red;margin:0}\n')

    def test_rules_in_different_contexts_are_not_merged(self):
        nodes = ck.merge_duplicates(ck.parse('.a{color:red}@media print{.a{color:blue}}'))
        self.assertEqual(len([n for n in nodes if n.decls]), 2)


class Split(unittest.TestCase):
    def test_owner_is_the_leftmost_class_outside_pseudos(self):
        self.assertEqual(ck.owner_file('.hero-visual .concept', ''), 'pages/home.css')
        self.assertEqual(ck.owner_file('.js-enabled .header nav', ''), 'components/header.css')
        self.assertEqual(ck.owner_file('main :is(h1,h2)', ''), 'base.css')
        self.assertEqual(ck.owner_file('#af-progress', ''), 'components/demo.css')
        self.assertEqual(ck.owner_file('.af-step', ''), 'components/demo.css')
        self.assertEqual(ck.owner_file('.af-product-hero .pill', ''), 'pages/addvancedfocus.css')
        self.assertEqual(ck.owner_file('.header', '@media print'), 'media.css')
        self.assertEqual(ck.owner_file('.header', '@media(prefers-reduced-motion:reduce)'), 'media.css')

    def test_unknown_class_is_an_error(self):
        with self.assertRaises(KeyError):
            ck.owner_file('.never-mapped', '')

    def test_selector_lists_are_distributed_and_files_follow_style_order(self):
        files = ck.split(ck.parse(':root{--x:1px}h1,.hero,.wrap{margin:0}.pill{color:red}@keyframes enter{to{opacity:1}}'))
        self.assertEqual(list(files), ['tokens.css', 'base.css', 'layout.css', 'components/pills.css', 'pages/home.css'])
        self.assertEqual(ck.serialize(files['base.css']), 'h1{margin:0}\n@keyframes enter{to{opacity:1}}\n')
        self.assertEqual(ck.serialize(files['layout.css']), '.wrap{margin:0}\n')
        self.assertEqual(ck.serialize(files['pages/home.css']), '.hero{margin:0}\n')


if __name__ == '__main__':
    unittest.main()
