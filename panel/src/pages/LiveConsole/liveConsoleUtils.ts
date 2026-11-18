import { copyToClipboard } from "@/lib/utils";
import { TimestampMode } from "./xtermOptions";
import { ANSI } from "./liveConsoleColors";


//Yoinked from core/modules/Logger/FXServerLogger/index.ts
const regexControls = /[\x00-\x08\x0B-\x1A\x1C-\x1F\x7F]|(?:\x1B\[|\x9B)[\d;]+[@-K]/g;
const regexColors = /\x1B[^m]*?m/g;


/**
 * Sanitizes a term line from control characters and colors
 */
export const sanitizeTermLine = (data: string) => {
    return data.replace(regexControls, '').replace(regexColors, '');
}


/**
 * Extracts the timestamp from a term line.
 * Format defined in core/modules/Logger/FXServerLogger/ConsoleTransformer.ts
 */
export const extractTermLineTimestamp = (line: string) => {
    if (/^{§[0-9a-f]{8}}/.test(line)) {
        return {
            ts: parseInt(line.slice(2, 10), 16),
            content: line.slice(11),
        };
    } else {
        return {
            ts: null,
            content: line,
        };
    }
}


/**
 * Formats a timestamp into a console prefix
 */
export const formatTermTimestamp = (ts: number, timestampMode: TimestampMode): string => {
    if (timestampMode === 'DISABLED') return ANSI.RESET;
    const time = new Date(ts * 1000);
    const str = time.toLocaleTimeString(
        'en-US', //as en-gb uses 4 digits for the am/pm indicator
        {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: timestampMode === 'FORCE12H' ? true :
                timestampMode === 'FORCE24H' ? false :
                    window.txBrowserHour12,
        }
    );

    // adding ansi reset to prevent color bleeding
    return str + ANSI.RESET + ' ';
}


export const getEmptyTermTimestamp = (timestampMode: TimestampMode) => {
    return formatTermTimestamp(Date.now(), timestampMode).replace(/\w/g, '-');
}

/**
 * Filters a string to be copied to the clipboard
 */
export const filterTermLine = (
    selection: string,
    copyTimestamp: boolean,
    copyTag: boolean
) => {
    if (copyTimestamp && copyTag) return selection;
    const lineRegex = /^(?<ts>\d{2}:\d{2}:\d{2}(?: [AP]M)? )?(?<tag>\[.{20}] )?(?<content>.*)?/;
    const match = selection.match(lineRegex);
    if (!match) return selection;
    const { ts, tag, content } = match.groups ?? {};
    let prefix = '';
    if (copyTimestamp) prefix += ts ?? '';
    if (copyTag) prefix += tag ?? '';
    return prefix + (content ?? '').trimEnd();
}


/**
 * Copies a string to the clipboard
 */
export const copyTermLine = async (
    selection: string,
    divRef: HTMLDivElement,
    copyTimestamp: boolean,
    copyTag: boolean,
    returnFocusTo: HTMLElement | null = null
) => {
    const strToCopy = selection
        .split(/\r?\n/)
        .map(line => filterTermLine(line, copyTimestamp, copyTag))
        .join('\r\n') //assuming the user is on windows
        .replace(/(\r?\n)+$/, '\r\n'); //single one at the end, if any
    return copyToClipboard(strToCopy, divRef, returnFocusTo);
}


/**
 * Get the number of font-mono variants loaded
 */
export const getNumFontVariantsLoaded = (cssVar: string, label: string) => {
    console.groupCollapsed('getNumFontVariantsLoaded:', label);

    //This is required because in firefox, font.family has " and in chrome it doesn't
    const normalizeFamily = (family: string) => family.toLowerCase().replace(/^["']|["']$/g, '');

    //first we need to resolve what is the var(--font-mono) value
    if (!cssVar) return 0;
    const fontFamily = normalizeFamily(getComputedStyle(document.documentElement).getPropertyValue(cssVar));
    if (!fontFamily) {
        console.error('No --font-mono value found');
        return 0;
    }
    console.log('--font-mono:', fontFamily);

    let loadedCount = 0;
    for (const font of document.fonts) {
        if (normalizeFamily(font.family) !== fontFamily) continue;
        const isLoaded = font.status === 'loaded';
        const color = isLoaded ? 'green' : 'red';
        console.log(`%c${font.status}:`, `color: ${color}`, font.unicodeRange);
        if (isLoaded) loadedCount++;
    }

    console.log('Loaded:', loadedCount);
    console.groupEnd();
    return loadedCount;
}
