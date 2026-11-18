import { afterAll, beforeAll, expect, it, suite, vi } from "vitest";
import { filterTermLine, formatTermTimestamp, sanitizeTermLine } from "./liveConsoleUtils";
import type { TimestampMode } from "./xtermOptions";

suite('filterTermLine', () => {
    // Mocking the global window object for the test environment
    beforeAll(() => vi.stubGlobal('window', { txBrowserHour12: false }));
    afterAll(() => vi.unstubAllGlobals());

    // Wrapper that sanitizes input before filtering (simulating real usage)
    const fnc = (input: string, copyTimestamp: boolean, copyTag: boolean) =>
        filterTermLine(sanitizeTermLine(input), copyTimestamp, copyTag);

    const exampleLines = {
        empty: '',
        info: '[             TXADMIN] ================================================================ ',
        resGroup: '[resources:[builders]] Warning: [builders]x does not have a resource manifest (fxmanifest.lua)',
        input: '[             tabarra] dd ',
        normal: '[           resources] Scanning resources.',
        normal2: '[                 cmd] No such command dd.',
        normal3: '[ citizen-server-main] Warning: The players.json endpoint has been modified',
    };

    suite('timestamp formats', () => {
        it('should handle 24-hour format when timestampForceHour12 is false', () => {
            const tsMode: TimestampMode = 'FORCE24H';
            const ts = 14 * 3600; // 14:00:00
            const input = formatTermTimestamp(ts, tsMode) + exampleLines.normal;
            expect(fnc(input, true, true)).toEqual(sanitizeTermLine(input));
        });

        it('should handle 12-hour format when timestampForceHour12 is true', () => {
            const tsMode: TimestampMode = 'FORCE12H';
            const ts = 14 * 3600; // 2:00:00 PM
            const input = formatTermTimestamp(ts, tsMode) + exampleLines.normal;
            expect(fnc(input, true, true)).toEqual(sanitizeTermLine(input));
        });
    });

    suite('copyTimestamp and copyTag options', () => {
        it('should return full line when copyTimestamp and copyTag are true', () => {
            const tsMode: TimestampMode = 'FORCE24H';
            const ts = 10 * 3600; // 10:00:00
            const input = formatTermTimestamp(ts, tsMode) + exampleLines.input;
            expect(fnc(input, true, true)).toEqual(sanitizeTermLine(input));
        });

        it('should remove timestamp when copyTimestamp is false', () => {
            const tsMode: TimestampMode = 'FORCE24H';
            const ts = 10 * 3600; // 10:00:00
            const input = formatTermTimestamp(ts, tsMode) + exampleLines.input;
            const expected = exampleLines.input.trimEnd();
            expect(fnc(input, false, true)).toEqual(expected);
        });

        it('should remove tag when copyTag is false', () => {
            const tsMode: TimestampMode = 'FORCE24H';
            const ts = 0;
            const input = formatTermTimestamp(ts, tsMode) + exampleLines.input;
            const timestamp = sanitizeTermLine(formatTermTimestamp(ts, tsMode));
            const expected = timestamp + 'dd';
            expect(fnc(input, true, false)).toEqual(expected);
        });

        it('should remove both timestamp and tag when both copyTimestamp and copyTag are false', () => {
            const tsMode: TimestampMode = 'FORCE24H';
            const ts = 0;
            const content = 'whatever';
            const input = formatTermTimestamp(ts, tsMode) + content;
            expect(fnc(input, false, false)).toEqual(content);
        });
    });

    suite('handling empty and various lines', () => {
        it('should handle empty line', () => {
            expect(fnc('', true, true)).toEqual('');
        });

        it('should handle line without timestamp', () => {
            const input = exampleLines.normal;
            expect(fnc(input, true, true)).toEqual(exampleLines.normal);
        });
    });

    suite('AM/PM formatting', () => {
        it('should correctly filter AM time when copyTimestamp is true', () => {
            const tsMode: TimestampMode = 'FORCE12H';
            const ts = 5 * 3600; // 5:00:00 AM
            const input = formatTermTimestamp(ts, tsMode) + exampleLines.normal;
            expect(fnc(input, true, true)).toEqual(sanitizeTermLine(input));
        });

        it('should correctly filter PM time when copyTimestamp is false', () => {
            const tsMode: TimestampMode = 'FORCE12H';
            const ts = 17 * 3600; // 5:00:00 PM
            const input = formatTermTimestamp(ts, tsMode) + exampleLines.normal;
            const expected = exampleLines.normal;
            expect(fnc(input, false, true)).toEqual(expected);
        });
    });

    suite('comprehensive example tests', () => {
        it('should handle all example lines with base options (copyTimestamp: true, copyTag: true)', () => {
            for (const [_key, input] of Object.entries(exampleLines)) {
                const sanitized = sanitizeTermLine(input);
                expect(fnc(input, true, true)).toEqual(sanitized);
            }
        });
    });
});
