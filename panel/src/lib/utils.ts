import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Socket, io } from "socket.io-client";
import type { BanDurationType } from "@shared/otherTypes";
import { ListenEventsMap } from "@shared/socketioTypes";


/**
 * clsx then tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}


/**
 * Removes the indentation of multiline strings based on the minimum length of indentation
 */
export const stripIndent = (src: string) => {
    const indentSearchRegex = /^[ \t]*(?=\S)/gm;
    const indents = src.substring(src.indexOf('\n')).match(indentSearchRegex);
    if (!indents) return src;
    const minIndent = indents.reduce((r, a) => Math.min(r, a.length), Infinity);
    const indentRemoverRegex = new RegExp(`^[ \\t]{${minIndent}}`, 'gm');
    return src.replace(indentRemoverRegex, '');
};


/**
 * Converts a number to a locale string with commas and decimals
 */
export const numberToLocaleString = (num: number, decimals = 0) => {
    return num.toLocaleString(
        window.txBrowserLocale,
        { maximumFractionDigits: decimals }
    );
};


/**
 * Returns a socket.io client instance
 */
export const getSocket = (rooms: string[] | string) => {
    const socketOpts = {
        transports: ['polling'],
        upgrade: false,
        query: {
            rooms,
            uiVersion: window.txConsts.txaVersion,
        }
    };

    const socket = window.txConsts.isWebInterface
        ? io({ ...socketOpts, path: '/socket.io' })
        : io('monitor', { ...socketOpts, path: '/WebPipe/socket.io' });

    //Can't use the generic type on io(), so need to apply it here
    return socket as Socket<ListenEventsMap, any>;
}


/**
 * Returns a random hsl() color - useful for testing react rendering stuff
 */
export const createRandomHslColor = (alpha?: number) => {
    const hue = Math.floor(Math.random() * 360);
    return typeof alpha === 'number'
        ? `hsla(${hue}, 100%, 50%, ${alpha})`
        : `hsl(${hue}, 100%, 50%)`
}


/**
 * Returns a deterministic hsl() color based on a seed string
 */
export const createSeedHslColor = (seed: string, alpha?: number) => {
    const hash = seed.split('').reduce((acc, char) => {
        return ((acc << 5) - acc) + char.charCodeAt(0) | 0;
    }, 0);
    const hue = Math.abs(hash % 360);
    return typeof alpha === 'number'
        ? `hsla(${hue}, 100%, 50%, ${alpha})`
        : `hsl(${hue}, 100%, 50%)`;
}


/**
 * Copy text to clipboard.
 * Only if on web, attempt to use the Clipboard API. If it fails, fallback to the old method.
 * Because we don't have access to Clipboard API in FiveM's CEF, as well as on
 * non-localhost origins without https, we need to use the old school method.
 * It does seem to work on Firefox though.
 */
export const copyToClipboard = async (
    value: string,
    surrogate: HTMLDivElement,
    returnFocusTo: HTMLElement | null = null,
) => {
    const copyViaApi = () => navigator.clipboard.writeText(value);
    const copyViaInput = () => {
        const clipElem = document.createElement("textarea");
        clipElem.id = 'clipboard-input-' + Math.random().toString(36).substring(2, 15);
        clipElem.value = value;
        clipElem.style.position = 'fixed';
        clipElem.style.opacity = '0';
        clipElem.style.top = '0';
        clipElem.style.left = '0';
        surrogate.appendChild(clipElem);
        clipElem.select();
        const result = document.execCommand("copy");
        document.addEventListener('copy', () => {
            setTimeout(() => {
                try {
                    surrogate.removeChild(clipElem);
                    console.log('Removed clipboard temporary target:', clipElem.id);
                } catch (error) {
                    console.log('Failed to remove clipboard temporary target:', clipElem.id);
                } finally {
                    if (returnFocusTo) returnFocusTo.focus();
                };
            }, 0);
        }, {
            once: true,
            signal: AbortSignal.timeout(250)
        });
        return result;
    }

    //try to prevent printing error on devtools
    if (window.txConsts.isWebInterface && navigator.clipboard) {
        try {
            return await copyViaApi();
        } catch (error1) {
            return copyViaInput();
        }
    } else {
        console.warn('Clipboard API not available, copying via textarea.');
        return copyViaInput();
    }
}


/**
 * Converts the duration object to a lowercase string with correct unit pluralization
 */
export const banDurationToString = (duration: BanDurationType) => {
    if (duration === 'permanent') return 'permanent';
    if (typeof duration === 'string') return duration;
    const pluralizedString = duration.value === 1 ? duration.unit.slice(0, -1) : duration.unit;
    return `${duration.value} ${pluralizedString}`;
}


/**
 * Converts the duration object to a short string
 */
export const banDurationToShortString = (duration: BanDurationType) => {
    if (typeof duration === 'string') {
        return duration === 'permanent' ? 'PERM' : duration;
    }

    let suffix: string;
    if (duration.unit === 'hours') {
        suffix = 'h';
    } else if (duration.unit === 'days') {
        suffix = 'd';
    } else if (duration.unit === 'weeks') {
        suffix = 'w';
    } else if (duration.unit === 'months') {
        suffix = 'mo';
    } else {
        suffix = duration.unit;
    }
    return `${duration.value}${suffix}`;
}


/**
 * Save a file to the user's computer
 * @returns true if download was initiated successfully, false otherwise
 */
export const downloadTextFile = (content: string, fileName: string, fileType: 'txt' | 'json' | 'md' = 'txt'): boolean => {
    try {
        // Check if we're in a browser environment
        if (typeof document === 'undefined' || !document.body) {
            console.warn('downloadTextFile: document or document.body not available');
            return false;
        }

        const mimeType = fileType === 'txt'
            ? 'text/plain'
            : fileType === 'json'
                ? 'application/json'
                : 'text/markdown';

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.${fileType}`;
        
        // Make the link invisible
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return true;
    } catch (error) {
        console.error('downloadTextFile failed:', error);
        return false;
    }
}
