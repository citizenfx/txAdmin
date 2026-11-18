import { isIPv6 } from 'node:net';

const modulename = 'IpChecker';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

const extendedAllowedLanIps: string[] = [];


/**
 * Return if the IP Address is a loopback interface, LAN, detected WAN or any other
 * IP that is registered by the user via the forceInterface convar or config file.
 * 
 * This is used to secure the webpipe auth and the rate limiter.
 */
export const isIpAddressLocal = (ipAddress: string): boolean => {
    return (
        /^(127\.|::ffff:127\.|192\.168\.|::ffff:192\.168\.|10\.|::ffff:10\.|::1|fd00::)/.test(ipAddress)
        || extendedAllowedLanIps.includes(ipAddress)
    )
}


/**
 * Used to register a new LAN interface. 
 * Added automatically from TXHOST_INTERFACE and banner.js after detecting the WAN address.
 */
export const addLocalIpAddress = (ipAddress: string): void => {
    // console.verbose.debug(`Adding local IP address: ${ipAddress}`);
    extendedAllowedLanIps.push(ipAddress);
}


/**
 * Formats a host:port string, wrapping IPv6 addresses in brackets per RFC 3986.
 */
export const formatHostPort = (host: string, port: number | string): string => {
    if (host.includes(':')) return `[${host}]:${port}`;
    return `${host}:${port}`;
}


/**
 * Returns the key to be used when rate limiting or banning an IP address.
 * - IPv4-mapped IPv6 addresses (::ffff:a.b.c.d) are converted back to plain IPv4.
 * - IPv6 addresses are grouped by their /64 prefix, since a single client usually
 *   controls a whole /64 and could otherwise rotate addresses to bypass the limits.
 * - Anything else (IPv4, invalid input) is returned as-is.
 */
export const getIpRateLimitKey = (ipAddress: string): string => {
    if (typeof ipAddress !== 'string') return ipAddress;
    const mappedMatch = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ipAddress);
    if (mappedMatch) return mappedMatch[1];
    const addr = ipAddress.split('%')[0]; //strip zone index
    if (!isIPv6(addr)) return ipAddress;

    //Expanding the address to get the first 4 hextets
    const [head, tail] = addr.split('::') as [string, string | undefined];
    const headParts = head ? head.split(':') : [];
    let hextets: string[];
    if (tail === undefined) {
        hextets = headParts;
    } else {
        const tailParts = tail ? tail.split(':') : [];
        //an embedded IPv4 tail takes two hextets
        const tailSize = tailParts.reduce((acc, p) => acc + (p.includes('.') ? 2 : 1), 0);
        const fill = Array(Math.max(0, 8 - headParts.length - tailSize)).fill('0');
        hextets = [...headParts, ...fill, ...tailParts];
    }
    const prefix = hextets
        .slice(0, 4)
        .map((h) => parseInt(h, 16).toString(16))
        .join(':');
    return `${prefix}::/64`;
}
