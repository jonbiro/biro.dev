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


if __name__ == '__main__':
    unittest.main()
