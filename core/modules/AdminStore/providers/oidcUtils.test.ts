import { suite, it, expect } from 'vitest';
import { checkRequiredClaim, findAvailableAdminName, sanitizeOidcUsername } from './oidcUtils';
import consts from '@shared/consts';


suite('sanitizeOidcUsername', () => {
    it('should keep valid usernames', () => {
        expect(sanitizeOidcUsername('john_doe')).toBe('john_doe');
        expect(sanitizeOidcUsername('Admin.01')).toBe('Admin.01');
    });
    it('should use the local part of emails', () => {
        expect(sanitizeOidcUsername('john.doe@example.com')).toBe('john.doe');
    });
    it('should replace invalid chars and diacritics', () => {
        expect(sanitizeOidcUsername('Jörg Müller')).toBe('Jorg_Muller');
        expect(sanitizeOidcUsername('a  b!!c')).toBe('a_b_c');
    });
    it('should trim non-alphanumeric edges', () => {
        expect(sanitizeOidcUsername('__john__')).toBe('john');
        expect(sanitizeOidcUsername('.-john-.')).toBe('john');
    });
    it('should truncate to 20 chars', () => {
        const res = sanitizeOidcUsername('a'.repeat(30));
        expect(res).toHaveLength(20);
    });
    it('should fallback for invalid inputs', () => {
        expect(sanitizeOidcUsername(undefined)).toBe('sso_user');
        expect(sanitizeOidcUsername('')).toBe('sso_user');
        expect(sanitizeOidcUsername('ab')).toBe('sso_user');
        expect(sanitizeOidcUsername('日本語')).toBe('sso_user');
    });
    it('should always return valid admin names', () => {
        const inputs = ['x'.repeat(19) + '__y', 'a.b.c', 'Ünïcödé user', '  spaced  ', 'a@b'];
        for (const input of inputs) {
            expect(sanitizeOidcUsername(input)).toMatch(consts.regexValidFivemUsername);
        }
    });
});


suite('findAvailableAdminName', () => {
    it('should return the base name if free', () => {
        expect(findAvailableAdminName('john', () => false)).toBe('john');
    });
    it('should append a numeric suffix', () => {
        const taken = new Set(['john', 'john_2']);
        expect(findAvailableAdminName('john', (n) => taken.has(n))).toBe('john_3');
    });
    it('should respect the max length', () => {
        const base = 'a'.repeat(20);
        const res = findAvailableAdminName(base, (n) => n === base);
        expect(res).toHaveLength(20);
        expect(res.endsWith('_2')).toBe(true);
    });
});


suite('checkRequiredClaim', () => {
    const claims = {
        groups: ['users', 'txadmin'],
        role: 'staff',
        verified: true,
    };
    it('should allow everything without filter', () => {
        expect(checkRequiredClaim(claims, null, null)).toBe(true);
    });
    it('should check claim presence only', () => {
        expect(checkRequiredClaim(claims, 'role', null)).toBe(true);
        expect(checkRequiredClaim(claims, 'missing', null)).toBe(false);
    });
    it('should check string values', () => {
        expect(checkRequiredClaim(claims, 'role', 'staff')).toBe(true);
        expect(checkRequiredClaim(claims, 'role', 'admin')).toBe(false);
    });
    it('should check array values', () => {
        expect(checkRequiredClaim(claims, 'groups', 'txadmin')).toBe(true);
        expect(checkRequiredClaim(claims, 'groups', 'tx')).toBe(false);
    });
    it('should check boolean values', () => {
        expect(checkRequiredClaim(claims, 'verified', 'true')).toBe(true);
    });
});
