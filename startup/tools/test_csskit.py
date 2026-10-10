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

    def test_block_at_rules_that_contain_style_rules_are_rejected(self):
        for prelude in ('@container (min-width:30rem)', '@layer base', '@starting-style', '@scope (.card)'):
            with self.assertRaises(ValueError, msg=prelude):
                ck.parse(prelude + '{.a{gap:2rem}}')

    def test_descriptor_at_rules_are_kept_verbatim(self):
        for css in ('@font-face{font-family:x;src:url(x.woff2)}', '@keyframes k{to{opacity:1}}',
                    '@property --x{syntax:"<length>";inherits:false;initial-value:0}'):
            self.assertEqual(type(ck.parse(css)[0]).__name__, 'Raw', css)

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

    def test_media_declaration_dominated_by_a_later_top_level_rule_is_removed(self):
        out, count = self.run_prune('.a{gap:2px}@media(max-width:10rem){.a{font-size:12px;gap:1px}}.a{font-size:14px}')
        self.assertEqual(out, '.a{gap:2px}\n@media(max-width:10rem){\n  .a{gap:1px}\n}\n.a{font-size:14px}\n')
        self.assertEqual(count, 1)

    def test_narrower_max_width_declaration_dominated_by_a_later_wider_one_is_removed(self):
        out, count = self.run_prune('@media(max-width:47.5rem){.h{padding:22px 24px}}@media(max-width:59.999rem){.h{padding:1rem}}')
        self.assertEqual((out, count), ('@media(max-width:59.999rem){\n  .h{padding:1rem}\n}\n', 1))

    def test_wider_earlier_or_mixed_unit_conditions_are_kept(self):
        for css in ('@media(max-width:60rem){.h{gap:1px}}@media(max-width:47.5rem){.h{gap:2px}}',
                    '@media(max-width:700px){.h{gap:1px}}@media(max-width:60rem){.h{gap:2px}}',
                    '@media(max-width:40rem){.h{gap:1px}}@media(min-width:10rem){.h{gap:2px}}'):
            self.assertEqual(self.run_prune(css)[1], 0, css)

    def test_top_level_declaration_is_not_dominated_by_a_later_media_rule(self):
        _, count = self.run_prune('.a{font-size:14px}@media(max-width:10rem){.a{font-size:12px}}')
        self.assertEqual(count, 0)

    def test_progressive_fallbacks_are_kept(self):
        _, count = self.run_prune('.a{min-height:100vh}.a{min-height:100dvh}')
        self.assertEqual(count, 0)

    def test_minmax_is_not_mistaken_for_a_max_fallback(self):
        _, count = self.run_prune('.a{grid-template-columns:1fr}.a{grid-template-columns:minmax(0,1fr)}')
        self.assertEqual(count, 1)

    def test_newer_values_keep_their_earlier_fallback(self):
        for older, newer in [('overflow:hidden', 'overflow:clip'), ('color:#fff', 'color:oklch(70% .1 250)'),
                             ('text-wrap:balance', 'text-wrap:pretty'), ('margin-top:1.5em', 'margin-top:1lh')]:
            _, count = self.run_prune(f'.a{{{older}}}.a{{{newer}}}')
            self.assertEqual(count, 0, (older, newer))

    def test_plain_values_are_still_pruned(self):
        for older, newer in [('color:red', 'color:#8bb6ff'), ('padding:28px 24px', 'padding:1.5rem 1rem'),
                             ('width:calc(100% - 2rem)', 'width:var(--w)'), ('display:block', 'display:flex')]:
            _, count = self.run_prune(f'.a{{{older}}}.a{{{newer}}}')
            self.assertEqual(count, 1, (older, newer))

    def test_duplicates_inside_one_rule_are_kept(self):
        _, count = self.run_prune('.a{display:block;display:grid}')
        self.assertEqual(count, 0)


class Tokenize(unittest.TestCase):
    def test_colors_vars_radii_gaps_and_breakpoints_are_tokenized(self):
        css = (':root{color-scheme:dark;--ink:#e7eef9;--muted:#acbad0;--blue:#8bb6ff;--line:#293b55;--pale:#101d30}'
               '.a{color:var(--ink);background:#101D30;border:1px solid #304965;border-radius:1rem;gap:1.5rem;'
               'box-shadow:0 0 4px #00000040;outline-color:var(--blue);border-color:var(--line);fill:var(--muted)}'
               '@media(prefers-contrast:more){:root{--muted:#d2def0;--line:#6685af}}'
               '@media(max-width:760px){.a{gap:10px}}')
        out = ck.serialize(ck.tokenize(ck.parse(css)))
        root, rest = out.split('\n', 1)
        self.assertTrue(root.startswith(':root{color-scheme:dark;--color-bg:#090f1b;'))
        for token in ('--text:#e7eef9', '--text-muted:#acbad0', '--border-line:#293b55', '--accent:#8bb6ff', '--space-6:1.5rem'):
            self.assertIn(token, root)
        for removed in ('--ink', '--pale', '--muted:', '--blue', '--line'):
            self.assertNotIn(removed, root)
        self.assertEqual(rest, (
            '.a{color:var(--text);background:var(--surface-2);border:1px solid var(--border-2);'
            'border-radius:var(--radius-md);gap:var(--space-6);box-shadow:0 0 4px var(--shadow-color);'
            'outline-color:var(--accent);border-color:var(--border-line);fill:var(--text-muted)}\n'
            '@media(prefers-contrast:more){\n  :root{--text-muted:#d2def0;--border-line:var(--border-5)}\n}\n'
            '@media(max-width:47.5rem){\n  .a{gap:10px}\n}\n'))

    def test_effective_values_of_renamed_properties_must_match_the_token_table(self):
        with self.assertRaises(ValueError):
            ck.tokenize(ck.parse(':root{--muted:#d2def0}.a{color:var(--muted)}'))


class Related(unittest.TestCase):
    def test_shorthands_longhands_logical_and_side_groups_are_related(self):
        for a, b in [('padding', 'padding-top'), ('gap', 'row-gap'), ('border-radius', 'border-top-left-radius'),
                     ('margin-inline', 'margin-left'), ('font', 'line-height'), ('color', 'color'),
                     ('border-color', 'border-top-color'), ('border', 'border-left-width'), ('grid-gap', 'gap'), ('all', 'color')]:
            self.assertTrue(ck.related(a, b), (a, b))
            self.assertTrue(ck.related(b, a), (b, a))

    def test_overlapping_shorthands_aliases_and_logical_sizes_are_related(self):
        for a, b in [('border-top', 'border-color'), ('border-left', 'border-width'), ('grid-area', 'grid-row'),
                     ('inset-inline', 'left'), ('text-wrap', 'white-space'), ('-webkit-backdrop-filter', 'backdrop-filter'),
                     ('word-wrap', 'overflow-wrap'), ('grid-row-gap', 'row-gap'), ('inline-size', 'width'),
                     ('border-start-start-radius', 'border-radius'), ('frobnicate', 'color')]:
            self.assertTrue(ck.related(a, b), (a, b))
            self.assertTrue(ck.related(b, a), (b, a))

    def test_unrelated_properties(self):
        for a, b in [('color', 'background-color'), ('display', 'gap'), ('--a', '--b'),
                     ('padding-top', 'padding-left'), ('border-radius', 'border-color'), ('margin-top', 'margin-bottom')]:
            self.assertFalse(ck.related(a, b), (a, b))


class Merge(unittest.TestCase):
    def test_earlier_rule_folds_into_the_last_one_when_nothing_between_conflicts(self):
        nodes = ck.merge_duplicates(ck.parse('.a{color:red}.b{margin:0}.a{padding:0}'))
        self.assertEqual(ck.serialize(nodes), '.b{margin:0}\n.a{color:red;padding:0}\n')

    def test_declaration_stays_when_a_rule_between_sets_a_related_property(self):
        nodes = ck.merge_duplicates(ck.parse('.a{color:red;padding:1px}.b{padding-top:2px}.a{margin:0}'))
        # padding never moves past .b's padding-top; the unrelated declarations fold back into the first rule.
        self.assertEqual(ck.serialize(nodes), '.a{padding:1px;color:red;margin:0}\n.b{padding-top:2px}\n')

    def test_later_rule_folds_back_into_the_first_when_forward_is_blocked(self):
        nodes = ck.merge_duplicates(ck.parse('.a{gap:1px}@media print{.a{gap:2px}}.a{color:red}'))
        self.assertEqual(ck.serialize(nodes), '.a{gap:1px;color:red}\n@media print{\n  .a{gap:2px}\n}\n')

    def test_rules_stay_apart_when_both_directions_are_blocked(self):
        # The blocker is a different selector, so neither moving nor replicating is safe.
        nodes = ck.merge_duplicates(ck.parse('.a{gap:1px}@media print{.b{gap:2px;color:blue}}.a{color:red}'))
        self.assertEqual(ck.serialize(nodes), '.a{gap:1px}\n@media print{\n  .b{gap:2px;color:blue}\n}\n.a{color:red}\n')

    def test_later_declaration_is_hoisted_and_replicated_into_a_same_selector_media_rule(self):
        css = '.t{display:none}@media(max-width:10rem){.t{display:block;border:1px solid red}}.t{border-color:blue}'
        self.assertEqual(ck.serialize(ck.merge_duplicates(ck.parse(css))), (
            '.t{display:none;border-color:blue}\n@media(max-width:10rem){\n  .t{display:block;border:1px solid red;border-color:blue}\n}\n'))

    def test_fallback_chain_keeps_old_browser_values(self):
        css = '.a{font-size:66px}@media(max-width:10rem){.a{font-size:46px}}.a{font-size:clamp(1rem,2vw,3rem)}'
        nodes, _ = ck.prune_overridden(ck.parse(css))
        self.assertEqual(ck.serialize(ck.merge_duplicates(nodes)), (
            '.a{font-size:66px;font-size:clamp(1rem,2vw,3rem)}\n'
            '@media(max-width:10rem){\n  .a{font-size:46px;font-size:clamp(1rem,2vw,3rem)}\n}\n'))

    def test_no_replication_into_a_different_selector(self):
        css = '.a{gap:1px}@media(max-width:10rem){.b{gap:2px}}.a{gap:3px}'
        nodes, _ = ck.prune_overridden(ck.parse(css))
        self.assertEqual(ck.serialize(ck.merge_duplicates(nodes)), '@media(max-width:10rem){\n  .b{gap:2px}\n}\n.a{gap:3px}\n')

    def test_backward_fold_never_jumps_a_related_sibling_that_stayed(self):
        css = '.card{padding-top:24px}.notice{padding-top:8px}.card{padding:0;padding-left:16px}'
        self.assertEqual(ck.serialize(ck.merge_duplicates(ck.parse(css))),
                         '.card{padding-top:24px}\n.notice{padding-top:8px}\n.card{padding:0;padding-left:16px}\n')

    def test_forward_fold_never_jumps_a_related_sibling_that_stayed(self):
        css = '.a{padding-left:1px;padding:0}.b{padding-top:2px}.a{color:red}'
        self.assertEqual(ck.serialize(ck.merge_duplicates(ck.parse(css))),
                         '.a{padding-left:1px;padding:0;color:red}\n.b{padding-top:2px}\n')

    def test_hoist_never_jumps_a_related_sibling_that_stayed(self):
        css = '.t{padding-top:4px}@media(max-width:10rem){.t{padding-left:clamp(1px,2vw,3px)}}.u{padding-top:1px}.t{padding:0;padding-left:9px}'
        self.assertEqual(ck.serialize(ck.merge_duplicates(ck.parse(css))), (
            '.t{padding-top:4px}\n@media(max-width:10rem){\n  .t{padding-left:clamp(1px,2vw,3px)}\n}\n'
            '.u{padding-top:1px}\n.t{padding:0;padding-left:9px}\n'))

    def test_rules_in_different_contexts_are_not_merged(self):
        nodes = ck.merge_duplicates(ck.parse('.a{color:red}@media print{.a{color:blue}}'))
        self.assertEqual(len([n for n in nodes if n.decls]), 2)


class ProbeSelector(unittest.TestCase):
    def test_states_attributes_and_pseudo_elements_are_stripped(self):
        self.assertEqual(ck.probe_selector('.a:hover::before'), '.a')
        self.assertEqual(ck.probe_selector('button[aria-pressed=true]:focus-visible'), 'button')
        self.assertEqual(ck.probe_selector('.header nav.open a'), '.header nav a')

    def test_compounds_left_empty_become_universal(self):
        self.assertEqual(ck.probe_selector('main :is(h1,h2)'), 'main *')
        self.assertEqual(ck.probe_selector(':root'), '*')
        self.assertEqual(ck.probe_selector('.cards:has(.card:nth-child(4)) > p:not(.x)'), '.cards > p')


class Specificity(unittest.TestCase):
    def test_selectors_level_4_specificity(self):
        cases = {'.a': (0, 1, 0), 'a': (0, 0, 1), '#af-progress': (1, 0, 0), '.skip:focus': (0, 2, 0),
                 '.a::before': (0, 1, 1), '*:after': (0, 0, 1), 'button[aria-pressed=true]': (0, 1, 1),
                 'main :is(h1,h2,.x)': (0, 1, 1), ':where(.a) p': (0, 0, 1),
                 '.cards:has(.card:nth-child(4):last-child)': (0, 4, 0), '.header nav>a:not(.nav-contact)': (0, 2, 2)}
        for selector, expected in cases.items():
            self.assertEqual(ck.specificity(selector), expected, selector)

    def test_order_between_different_specificities_never_blocks_a_merge(self):
        nodes = ck.merge_duplicates(ck.parse('.a{color:red}a{color:blue}.a{margin:0}'))
        self.assertEqual(ck.serialize(nodes), 'a{color:blue}\n.a{color:red;margin:0}\n')

    def test_identical_values_never_block_a_merge(self):
        nodes = ck.merge_duplicates(ck.parse('.a{color:red}@media print{.a{color:red;gap:1px}}.a{margin:0}'))
        self.assertEqual(ck.serialize(nodes), '@media print{\n  .a{color:red;gap:1px}\n}\n.a{color:red;margin:0}\n')

    def test_order_between_different_importance_never_blocks_a_merge(self):
        nodes = ck.merge_duplicates(ck.parse('@media print{.a{color:red}.b{color:blue!important}.a{margin:0}}'))
        self.assertEqual(ck.serialize(nodes), '@media print{\n  .b{color:blue!important}\n  .a{color:red;margin:0}\n}\n')

class MergeWithOverlap(unittest.TestCase):
    def test_rules_that_never_share_an_element_do_not_block_a_merge(self):
        overlaps = lambda a, b: {a, b} != {'.a', '.b'}
        nodes = ck.merge_duplicates(ck.parse('.a{padding:1px}.b{padding-top:2px}.a{margin:0}'), overlaps)
        self.assertEqual(ck.serialize(nodes), '.b{padding-top:2px}\n.a{padding:1px;margin:0}\n')

    def test_rules_that_can_share_an_element_still_block(self):
        nodes = ck.merge_duplicates(ck.parse('.a{padding:1px}.b{padding-top:2px}.a{margin:0}'), lambda a, b: True)
        self.assertEqual(ck.serialize(nodes), '.a{padding:1px;margin:0}\n.b{padding-top:2px}\n')

class Split(unittest.TestCase):
    def test_owner_is_the_leftmost_class_outside_pseudos(self):
        self.assertEqual(ck.owner_file('.hero .lead', ''), 'pages/home.css')
        self.assertEqual(ck.owner_file('.js-enabled .header nav', ''), 'components/header.css')
        self.assertEqual(ck.owner_file('main :is(h1,h2)', ''), 'base.css')
        self.assertEqual(ck.owner_file('#af-progress', ''), 'components/demo.css')
        self.assertEqual(ck.owner_file('.af-step', ''), 'components/demo.css')
        self.assertEqual(ck.owner_file('.af-product-hero .pill', ''), 'pages/addvancedfocus.css')
        self.assertEqual(ck.owner_file('.header', '@media print'), 'media.css')
        self.assertEqual(ck.owner_file('.header', '@media(prefers-reduced-motion:reduce)'), 'media.css')

    def test_overrides_can_target_one_media_context(self):
        saved = dict(ck.OWNER_OVERRIDES)
        try:
            ck.OWNER_OVERRIDES[('.concept h2', '@media(max-width:24rem)')] = 'pages/products.css'
            self.assertEqual(ck.owner_file('.concept h2', '@media(max-width:24rem)'), 'pages/products.css')
            self.assertEqual(ck.owner_file('.concept h2', ''), 'components/concept-card.css')
        finally:
            ck.OWNER_OVERRIDES.clear()
            ck.OWNER_OVERRIDES.update(saved)

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
