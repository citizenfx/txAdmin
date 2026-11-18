import { test, expect, suite, it } from 'vitest';
import * as idUtils from './idUtils';
import { shortenId } from '@shared/utils';


test('parsePlayerId', () => {
    let result = idUtils.parsePlayerId('FIVEM:555555');
    expect(result.isIdValid).toBe(true);
    expect(result.idType).toBe('fivem');
    expect(result.idValue).toBe('555555');
    expect(result.idlowerCased).toBe('fivem:555555');

    result = idUtils.parsePlayerId('fivem:xxxxx');
    expect(result.isIdValid).toBe(false);
});

test('parsePlayerIds', () => {
    const result = idUtils.parsePlayerIds(['fivem:555555', 'fivem:xxxxx']);
    expect(result.validIdsArray).toEqual(['fivem:555555']);
    expect(result.invalidIdsArray).toEqual(['fivem:xxxxx']);
    expect(result.validIdsObject?.fivem).toBe('555555');
});

test('filterPlayerHwids', () => {
    const result = idUtils.filterPlayerHwids([
        '5:55555555000000002d267c6638c8873d55555555000000005555555500000000',
        'invalidHwid'
    ]);
    expect(result.validHwidsArray).toEqual(['5:55555555000000002d267c6638c8873d55555555000000005555555500000000']);
    expect(result.invalidHwidsArray).toEqual(['invalidHwid']);
});

test('parseLaxIdsArrayInput', () => {
    const result = idUtils.parseLaxIdsArrayInput('55555555000000009999, steam:1100001ffffffff, invalid');
    expect(result.validIds).toEqual(['discord:55555555000000009999', 'steam:1100001ffffffff']);
    expect(result.invalids).toEqual(['invalid']);
});

test('getIdFromOauthNameid', () => {
    expect(idUtils.getIdFromOauthNameid('https://forum.cfx.re/internal/user/555555')).toBe('fivem:555555');
    expect(idUtils.getIdFromOauthNameid('xxxxx')).toBe(false);
});

//NOTE: testing here because the @shared workspace has no tests
test('shortenId', () => {
    // Invalid parameters
    expect(() => shortenId(123 as any)).toThrow('id');
    expect(() => shortenId('discord:123456789', 2)).toThrow('numChars');
    expect(() => shortenId('discord:123456789', 'invalid' as any)).toThrow('numChars');
    
    // Invalid id formats
    expect(shortenId('invalidFormat')).toBe('invalidFormat');
    expect(shortenId(':1234567890123456')).toBe(':1234567890123456');
    expect(shortenId('discord:')).toBe('discord:');

    // Default behavior (numChars = 4)
    expect(shortenId('discord:383919883341266945')).toBe('discord:3839…6945');
    expect(shortenId('xbl:12345678901')).toBe('xbl:1234…8901');
    
    // Valid ID with length <= threshold (should not be shortened)
    expect(shortenId('fivem:1234567890')).toBe('fivem:1234567890');
    expect(shortenId('steam:1234')).toBe('steam:1234');
    
    // Custom numChars parameter
    expect(shortenId('discord:383919883341266945', 3)).toBe('discord:383…945');
    expect(shortenId('discord:383919883341266945', 5)).toBe('discord:38391…66945');
    expect(shortenId('discord:383919883341266945', 6)).toBe('discord:383919…266945');
    expect(shortenId('2:bea2ac491d849477e66957b515f4a555a222e2e25911788d13fd46e9fda240a9', 20)).toBe('2:bea2ac491d849477e669…788d13fd46e9fda240a9');
    
    // Edge case: exactly at threshold
    expect(shortenId('discord:12345678', 3)).toBe('discord:12345678'); // 8 chars = 3*2+2, should not shorten
    expect(shortenId('discord:123456789', 3)).toBe('discord:123…789'); // 9 chars > 3*2+2, should shorten
});
