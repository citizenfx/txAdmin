import chalk from 'chalk';
import dateFormat from 'dateformat';
import humanizeDuration, { HumanizerOptions } from 'humanize-duration';
import { DeepReadonly } from 'utility-types';

export const regexHoursMinutes = /^(?<hours>[01]?[0-9]|2[0-4]):(?<minutes>[0-5][0-9])$/;


/**
 * Extracts hours and minutes from an string containing times
 */
export const parseSchedule = (scheduleTimes: string[]) => {
    const valid: {
        string: string;
        hours: number;
        minutes: number;
    }[] = [];
    const invalid = [];
    for (const timeInput of scheduleTimes) {
        if (typeof timeInput !== 'string') continue;
        const timeTrim = timeInput.trim();
        if (!timeTrim.length) continue;

        const m = timeTrim.match(regexHoursMinutes);
        if (m && m.groups?.hours && m.groups?.minutes) {
            if (m.groups.hours === '24') m.groups.hours = '00'; //Americans, amirite?!?!
            const timeStr = m.groups.hours.padStart(2, '0') + ':' + m.groups.minutes.padStart(2, '0');
            if (valid.some(item => item.string === timeStr)) continue;
            valid.push({
                string: timeStr,
                hours: parseInt(m.groups.hours),
                minutes: parseInt(m.groups.minutes),
            });
        } else {
            invalid.push(timeTrim);
        }
    }
    valid.sort((a, b) => {
        return a.hours - b.hours || a.minutes - b.minutes;
    });
    return { valid, invalid };
};


/**
 * Redacts known keys and tokens from a string
 * @deprecated Use redactApiKeysArr instead
 */
export const redactApiKeys = (src: string) => {
    if (typeof src !== 'string' || !src.length) return src;
    return src
        .replace(/licenseKey\s+["']?cfxk_\w{1,60}_(\w+)["']?.?$/gim, 'licenseKey [REDACTED cfxk...$1]')
        .replace(/steam_webApiKey\s+["']?\w{32}["']?.?$/gim, 'steam_webApiKey [REDACTED]')
        .replace(/sv_tebexSecret\s+["']?\w{40}["']?.?$/gim, 'sv_tebexSecret [REDACTED]')
        .replace(/rcon_password\s+["']?[^"']+["']?.?$/gim, 'rcon_password [REDACTED]')
        .replace(/mysql_connection_string\s+["']?[^"']+["']?.?$/gim, 'mysql_connection_string [REDACTED]')
        .replace(/discord\.com\/api\/webhooks\/\d{17,20}\/[\w\-_./=]{10,}(.*)/gim, 'discord.com/api/webhooks/[REDACTED]/[REDACTED]');
};


/**
 * Redacts known keys and tokens from an array of startup arguments.
 */
export const redactStartupSecrets = (args: string[]): string[] => {
    if (!Array.isArray(args) || args.length === 0) return args;

    const redactionRules: ApiRedactionRuleset = {
        sv_licenseKey: {
            regex: /^cfxk_\w{1,60}_(\w+)$/i,
            replacement: (_match, p1) => `[REDACTED cfxk...${p1}]`,
        },
        steam_webApiKey: {
            regex: /^\w{32}$/i,
            replacement: '[REDACTED]',
        },
        sv_tebexSecret: {
            regex: /^\w{40}$/i,
            replacement: '[REDACTED]',
        },
        rcon_password: {
            replacement: '[REDACTED]',
        },
        mysql_connection_string: {
            replacement: '[REDACTED]',
        },
        tx2faSecret: {
            replacement: '[REDACTED]',
        },
        'txAdmin-luaComToken': {
            replacement: '[REDACTED]',
        },
    };


    let outArgs: string[] = [];
    for (let i = 0; i < args.length; i++) {
        const currElem = args[i];
        const currElemLower = currElem.toLocaleLowerCase();
        const ruleMatchingPrefix = Object.keys(redactionRules).find((key) =>
            currElemLower.includes(key.toLocaleLowerCase())
        );
        // If no rule matches or there is no subsequent element, just push the current element.
        if (!ruleMatchingPrefix || i + 1 >= args.length) {
            outArgs.push(currElem);
            continue;
        }
        const rule = redactionRules[ruleMatchingPrefix];
        const nextElem = args[i + 1];
        // If the secret doesn't match the expected regex, treat it as a normal argument.
        if (rule.regex && !nextElem.match(rule.regex)) {
            outArgs.push(currElem);
            continue;
        }
        // Push the key and then the redacted secret.
        outArgs.push(currElem);
        if (typeof rule.replacement === 'string') {
            outArgs.push(rule.replacement);
        } else if (rule.regex) {
            outArgs.push(nextElem.replace(rule.regex, rule.replacement));
        }
        // Skip the secret value we just processed.
        i++;
    }

    //Apply standalone redaction rules
    outArgs = outArgs.map((arg) => arg
        .replace(/discord\.com\/api\/webhooks\/\d{17,20}\/[\w\-_./=]{10,}(.*)/gim, 'discord.com/api/webhooks/[REDACTED]/[REDACTED]')
    );

    if (args.length !== outArgs.length) {
        throw new Error('Input and output lengths are different after redaction.');
    }
    return outArgs;
};

type ApiRedactionRule = {
    regex?: RegExp;
    replacement: string | ((...args: any[]) => string);
};

type ApiRedactionRuleset = Record<string, ApiRedactionRule>;


/**
 * Returns the unix timestamp in seconds.
 */
export const now = () => Math.round(Date.now() / 1000);


/**
 * Returns the current time in HH:MM:ss format
 */
export const getTimeHms = (time?: string | number | Date) => dateFormat(time ?? new Date(), 'HH:MM:ss');


/**
 * Returns the current time in filename-friendly format
 */
export const getTimeFilename = (time?: string | number | Date) => dateFormat(time ?? new Date(), 'yyyy-mm-dd_HH-MM-ss');


/**
 * Converts a number of milliseconds to english words
 * Accepts a humanizeDuration config object
 * eg: msToDuration(ms, { units: ['h', 'm'] });
 */
export const msToDuration = humanizeDuration.humanizer({
    round: true,
    units: ['d', 'h', 'm'],
    fallbacks: ['en'],
} satisfies HumanizerOptions);


/**
 * Converts a number of milliseconds to short-ish english words
 */
export const msToShortishDuration = humanizeDuration.humanizer({
    round: true,
    units: ['d', 'h', 'm'],
    largest: 2,
    language: 'shortishEn',
    languages: {
        shortishEn: {
            y: (c) => 'year' + (c === 1 ? '' : 's'),
            mo: (c) => 'month' + (c === 1 ? '' : 's'),
            w: (c) => 'week' + (c === 1 ? '' : 's'),
            d: (c) => 'day' + (c === 1 ? '' : 's'),
            h: (c) => 'hr' + (c === 1 ? '' : 's'),
            m: (c) => 'min' + (c === 1 ? '' : 's'),
            s: (c) => 'sec' + (c === 1 ? '' : 's'),
            ms: (c) => 'ms',
        },
    },
});


/**
 * Converts a number of milliseconds to shortest english representation possible
 */
export const msToShortestDuration = humanizeDuration.humanizer({
    round: true,
    units: ['d', 'h', 'm', 's'],
    delimiter: '',
    spacer: '',
    largest: 2,
    language: 'shortestEn',
    languages: {
        shortestEn: {
            y: () => 'y',
            mo: () => 'mo',
            w: () => 'w',
            d: () => 'd',
            h: () => 'h',
            m: () => 'm',
            s: () => 's',
            ms: () => 'ms',
        },
    },
});


/**
 * Shorthand to convert seconds to the shortest english representation possible
 */
export const secsToShortestDuration = (ms: number, options?: humanizeDuration.Options) => {
    return msToShortestDuration(ms * 1000, options);
};


/**
 * Returns false if any argument is undefined
 */
export const anyUndefined = (...args: any) => [...args].some((x) => (typeof x === 'undefined'));


/**
 * Calculates expiration and duration from a ban duration string like "1 day"
 */
export const calcExpirationFromDuration = (inputDuration: string) => {
    let expiration;
    let duration;
    if (inputDuration === 'permanent') {
        expiration = false as const;
    } else {
        const [multiplierInput, unit] = inputDuration.split(/\s+/);
        const multiplier = parseInt(multiplierInput);
        if (isNaN(multiplier) || multiplier < 1) {
            throw new Error(`The duration number must be at least 1.`);
        }

        if (unit.startsWith('hour')) {
            duration = multiplier * 3600;
        } else if (unit.startsWith('day')) {
            duration = multiplier * 86400;
        } else if (unit.startsWith('week')) {
            duration = multiplier * 604800;
        } else if (unit.startsWith('month')) {
            duration = multiplier * 2592000; //30 days
        } else {
            throw new Error(`Invalid ban duration. Supported units: hours, days, weeks, months`);
        }
        expiration = now() + duration;
    }

    return { expiration, duration };
};


/**
 * Parses a number or string to a float with a limited precision.
 */
export const parseLimitedFloat = (src: number | string, precision = 6) => {
    const srcAsNum = typeof src === 'string' ? parseFloat(src) : src;
    return parseFloat(srcAsNum.toFixed(precision));
}


/**
 * Deeply freezes an object and all its nested properties
 */
export const deepFreeze = <T extends Record<string, any>>(obj: T) => {
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach((prop) => {
        if (Object.prototype.hasOwnProperty.call(obj, prop)
            && obj[prop] !== null
            && (typeof obj[prop] === 'object' || typeof obj[prop] === 'function')
            && !Object.isFrozen(obj[prop])
        ) {
            deepFreeze(obj[prop] as object);
        }
    });
    return obj;
    //FIXME: using DeepReadonly<T> will cause ts errors in ConfigStore
    // return obj as DeepReadonly<T>;
};


/**
 * Returns a chalk.inverse of a string with a 1ch padding
 */
export const chalkInversePad = (str: string) => chalk.inverse(` ${str} `);


/**
 * Parses a string to a safe and finite integer, or returns null if it's not a valid integer.
 */
export const parseFiniteIntString = (str: string) => {
    const parsed = parseInt(str);
    if (Number.isNaN(parsed) || !Number.isSafeInteger(parsed) || !Number.isFinite(parsed)) {
        return null;
    }
    return parsed;
}

/**
 * Returns a markdown code inline string
 */
export const mdCodeInline = (msg: string) => `\`${msg}\``;


/**
 * Returns a markdown code block string
 */
export const mdCodeBlock = (msg: string, lang: string | false = '', maxLen: number | false = false) => {
    const blockLang = lang ? lang : '';
    let blockMsg = msg;
    if (maxLen && blockMsg.length > maxLen) {
        blockMsg = blockMsg.substring(0, maxLen - 3) + '...';
    }
    const escapedMessage = blockMsg.replaceAll(/`/g, '\\\`');
    return `\`\`\`${blockLang}\n${escapedMessage}\n\`\`\``;
};
