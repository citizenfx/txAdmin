import { describe, expect, test } from 'vitest';
import {
    escapeHtmlAttribute,
    escapeHtmlContent,
    escapeHtmlRawText,
    sanitizeClassToken,
    sanitizeCssVarName,
    sanitizeCssVarValue,
    sanitizeSimpleHtml,
} from './htmlRenderSafety';

//MARK: HTML escapes
describe('escapeHtmlAttribute', () => {
    test('escapes all characters that could break a quoted attribute', () => {
        const value = `"'><script>alert(1)</script>&\``;
        expect(escapeHtmlAttribute(value)).toBe('&quot;&#39;&gt;&lt;script&gt;alert(1)&lt;/script&gt;&amp;&#96;');
    });

    test('coerces non-string values to string', () => {
        expect(escapeHtmlAttribute(123)).toBe('123');
        expect(escapeHtmlAttribute(null)).toBe('null');
        expect(escapeHtmlAttribute(undefined)).toBe('undefined');
    });
});

describe('escapeHtmlContent', () => {
    test('escapes tag and entity characters', () => {
        expect(escapeHtmlContent('<script>alert(1)</script>&')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;&amp;');
    });

    test('leaves quotes and backticks untouched', () => {
        expect(escapeHtmlContent(`"hello" 'world' \`foo\``)).toBe(`"hello" 'world' \`foo\``);
    });

    test('coerces non-string values to string', () => {
        expect(escapeHtmlContent(42)).toBe('42');
        expect(escapeHtmlContent(null)).toBe('null');
    });
});

describe('escapeHtmlRawText', () => {
    test('prevents </script> tag breakout', () => {
        expect(escapeHtmlRawText('</script><script>alert(1)</script>'))
            .toBe('\\u003c/script\\u003e\\u003cscript\\u003ealert(1)\\u003c/script\\u003e');
    });

    test('prevents </style> tag breakout', () => {
        expect(escapeHtmlRawText('</style><script>alert(1)</script>'))
            .toBe('\\u003c/style\\u003e\\u003cscript\\u003ealert(1)\\u003c/script\\u003e');
    });

    test('escapes line/paragraph separators', () => {
        expect(escapeHtmlRawText('a\u2028b\u2029c')).toBe('a\\u2028b\\u2029c');
    });

    test('works with JSON.stringify output for <script> injection', () => {
        const out = escapeHtmlRawText(JSON.stringify({ v: '</script><script>alert(1)</script>' }));
        expect(out).toBe('{"v":"\\u003c/script\\u003e\\u003cscript\\u003ealert(1)\\u003c/script\\u003e"}');
    });
});

//MARK: CSS sanitizers
describe('sanitizeClassToken', () => {
    test('keeps only safe class token chars', () => {
        expect(sanitizeClassToken('dark theme-foo" onload="evil()')).toBe('dark theme-foo onloadevil');
    });

    test('collapses extra whitespace', () => {
        expect(sanitizeClassToken('  dark   light  ')).toBe('dark light');
    });
});

describe('sanitizeCssVarName', () => {
    test('removes unsafe chars from css variable names', () => {
        expect(sanitizeCssVarName('x;}body{display:none/*')).toBe('xbodydisplaynone');
    });
});

describe('sanitizeCssVarValue', () => {
    test('strips characters that could break out of <style>', () => {
        expect(sanitizeCssVarValue('1;}</style><script>alert(1)</script>&ok')).toBe('1;}/stylescriptalert(1)/scriptok');
    });

    test('preserves normal CSS values', () => {
        expect(sanitizeCssVarValue('274 93% 39%')).toBe('274 93% 39%');
    });
});

//MARK: HTML sanitizers
describe('sanitizeSimpleHtml', () => {
    test('allows whitelisted formatting tags', () => {
        expect(sanitizeSimpleHtml('<strong>bold</strong> and <code>mono</code>'))
            .toBe('<strong>bold</strong> and <code>mono</code>');
    });

    test('allows self-closing <br>', () => {
        expect(sanitizeSimpleHtml('line1<br>line2')).toBe('line1<br>line2');
    });

    test('strips non-whitelisted tags', () => {
        expect(sanitizeSimpleHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    test('strips tags that were previously over-whitelisted', () => {
        const input = '<em>em</em><u>u</u><pre>pre</pre><p>p</p><a href="x">link</a>';
        expect(sanitizeSimpleHtml(input)).not.toContain('<em>');
        expect(sanitizeSimpleHtml(input)).not.toContain('<u>');
        expect(sanitizeSimpleHtml(input)).not.toContain('<pre>');
        expect(sanitizeSimpleHtml(input)).not.toContain('<p>');
        expect(sanitizeSimpleHtml(input)).not.toContain('<a');
    });
});
