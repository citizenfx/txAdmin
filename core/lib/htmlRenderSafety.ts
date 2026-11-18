/**
 * HTML rendering safety utilities for server-side template rendering.
 *
 * Each function is designed for a specific HTML context:
 * - Text content / body: escapeHtmlContent()
 * - Quoted attributes: escapeHtmlAttribute()
 * - Raw text elements (<script>/<style>): escapeHtmlRawText()
 * - Simple-formatted message HTML: sanitizeSimpleHtml()
 * - CSS class names and custom properties: sanitizeClassToken(), sanitizeCssVarName(), sanitizeCssVarValue()
 */
import { FilterXSS } from 'xss';


//MARK: Constants
// Escaping these in a quoted attribute prevents:
// - Breaking out of the attribute value (" ' `)
// - Injecting HTML tags (< >)
// - Injecting HTML entities (&)
const HTML_ATTR_ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;',
    '`': '&#96;',
};

// <script> and <style> are "raw text elements" in HTML - the browser doesn't parse
// HTML entities inside them, but it DOES look for the closing tag (e.g. </script>).
// Escaping < > & to unicode escapes prevents:
// - Closing the raw text element with </script> or </style>
// - Injecting HTML entities (&) which would be misinterpreted outside the raw text context
// U+2028/U+2029 are line/paragraph separators that can break JavaScript string literals.
const RAW_TEXT_ESCAPE_MAP: Record<string, string> = {
    '<': '\\u003c',
    '>': '\\u003e',
    '&': '\\u0026',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029',
};

// Matches characters that could break out of a quoted attribute.
const HTML_ATTR_ESCAPE_REGEX = /[&<>"'`]/g;

// Escaping < > & in text content prevents tag injection and entity misinterpretation.
// Quotes and backticks are harmless in text nodes, so they are not escaped here.
const HTML_CONTENT_ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
};
const HTML_CONTENT_ESCAPE_REGEX = /[&<>]/g;

// Matches characters that could break out of a raw text element (<script>/<style>).
// Shared between escapeHtmlRawText (which unicode-escapes them) and
// sanitizeCssVarValue (which strips them entirely).
const RAW_TEXT_BREAKOUT_REGEX = /[<>&\u2028\u2029]/g;

// Only allows safe CSS identifier characters: letters, digits, hyphens, underscores.
const CSS_SAFE_TOKEN_REGEX = /[^A-Za-z0-9_-]/g;


//MARK: HTML escapes
/**
 * Escapes a value for safe embedding in a **quoted** HTML attribute.
 * @example `<div class="${escapeHtmlAttribute(value)}">`
 */
export const escapeHtmlAttribute = (value: unknown) => {
    return String(value)
        .replace(HTML_ATTR_ESCAPE_REGEX, (char) => HTML_ATTR_ESCAPE_MAP[char]);
};

/**
 * Escapes a value for safe embedding in HTML text content (between tags).
 * Only escapes characters that could inject tags or entities; quotes and
 * backticks are left untouched since they are harmless in body text.
 * @example `<p>${escapeHtmlContent(userInput)}</p>`
 */
export const escapeHtmlContent = (value: unknown) => {
    return String(value)
        .replace(HTML_CONTENT_ESCAPE_REGEX, (char) => HTML_CONTENT_ESCAPE_MAP[char]);
};

/**
 * Escapes a string for safe embedding inside `<script>` or `<style>` raw text elements.
 * Replaces dangerous characters with unicode escapes to prevent tag breakout.
 * @example `<script>const data = ${escapeHtmlRawText(jsonString)};</script>`
 */
export const escapeHtmlRawText = (value: string) => {
    return value.replace(RAW_TEXT_BREAKOUT_REGEX, (char) => RAW_TEXT_ESCAPE_MAP[char]);
};


//MARK: CSS sanitizers
/**
 * Sanitizes a string for use as one or more CSS class tokens.
 * Splits on whitespace, strips unsafe characters, and rejoins.
 * @example `<div class="${sanitizeClassToken(userInput)}">`
 */
export const sanitizeClassToken = (value: string) => {
    return value
        .split(/\s+/g)
        .map((token) => token.replace(CSS_SAFE_TOKEN_REGEX, ''))
        .filter((token) => token.length)
        .join(' ');
};

/**
 * Sanitizes a string for use as a CSS custom property name (after the `--` prefix).
 * Only allows [A-Za-z0-9_-].
 * @example `--${sanitizeCssVarName(name)}: value;`
 */
export const sanitizeCssVarName = (value: string) => {
    return value.replace(CSS_SAFE_TOKEN_REGEX, '');
};

/**
 * Sanitizes a CSS property value by stripping characters that could break out of
 * a `<style>` raw text element (e.g. injecting `</style><script>alert(1)</script>`).
 * @example `--name: ${sanitizeCssVarValue(value)};`
 */
export const sanitizeCssVarValue = (value: string) => {
    return value.replace(RAW_TEXT_BREAKOUT_REGEX, '');
};


//MARK: HTML sanitizers
//FIXME: Deprecate this whenever ditching EJS & legacy pages
// Whitelist for sanitizeSimpleHtml — only tags actually used by renderMessage callers:
// <strong> and <code>: resources.js timeout/offline messages
// <br>: resources.js multi-line messages
// All the tags are also seen in the checkJoin.ts rejectMessageTemplate function
const simpleHtmlSanitizer = new FilterXSS({
    whiteList: {
        strong: [],
        br: [],
        code: [],
    },
});

/**
 * Sanitizes an HTML string, stripping all tags except a minimal formatting set
 * (`<strong>`, `<br>`, `<code>`). Intended for server-rendered message pages
 * where simple formatting is needed but arbitrary HTML must be rejected.
 */
export const sanitizeSimpleHtml = (value: string) => {
    return simpleHtmlSanitizer.process(value);
};
