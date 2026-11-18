const modulename = 'WebServer:RateLimiter';
import consoleFactory from '@lib/console';
import { isIpAddressLocal } from '@lib/host/isIpAddressLocal';
const console = consoleFactory(modulename);


/*
    Expected requests per user per minute:
      50    usual
     800    live console with ingame + 2 web pages
    2300    very very very heavy behavior
*/


//Config
const DDOS_THRESHOLD = 20_000;
const MAX_RPM_DEFAULT = 5000;
const MAX_RPM_UNDER_ATTACK = 2500;
const DDOS_COOLDOWN_MINUTES = 15;

//Vars
const bannedIps = new Set<string>(); //way faster than net.BlockList
const reqsPerIp = new Map<string, number>();
let httpRequestsCounter = 0;
let bansPendingWarn: string[] = [];
let minutesSinceLastAttack = Number.MAX_SAFE_INTEGER;


/**
 * Process the counts and declares a DDoS or not, as well as warns of new banned IPs.
 * Note if the requests are under the DDOS_THRESHOLD, banned ips will be immediately unbanned, so
 * in this case the rate limiter will only serve to limit instead of banning these IPs.
 */
setInterval(() => {
    if (httpRequestsCounter > DDOS_THRESHOLD) {
        minutesSinceLastAttack = 0;
        const numberFormatter = new Intl.NumberFormat('en-US');
        console.majorMultilineError([
            'You might be under a DDoS attack!',
            `txAdmin got ${numberFormatter.format(httpRequestsCounter)} HTTP requests in the last minute.`,
            `The attacker IP addresses have been blocked until ${DDOS_COOLDOWN_MINUTES} mins after the attack stops.`,
            'Make sure you have a proper firewall setup and/or a reverse proxy with rate limiting.',
            'You can join https://discord.gg/txAdmin for support.'
        ]);
    } else {
        minutesSinceLastAttack++;
        if (minutesSinceLastAttack > DDOS_COOLDOWN_MINUTES) {
            bannedIps.clear();
        }
    }
    httpRequestsCounter = 0;
    reqsPerIp.clear();
    if (bansPendingWarn.length) {
        console.warn('IPs blocked:', bansPendingWarn.join(', '));
        bansPendingWarn = [];
    }
}, 60_000);


/**
 * Checks if an IP is allowed to make a request based on the rate limit per IP.
 * The rate limit ignores local IPs.
 * The limits are calculated based on requests per minute, which varies if under attack or not.
 * All bans are cleared 15 minutes after the attack stops. 
 */
const checkRateLimit = (remoteAddress: string) => {
    // Sanity check on the ip
    if (typeof remoteAddress !== 'string' || !remoteAddress.length) return false;

    // Counting requests per minute
    httpRequestsCounter++;

    // Whitelist all local addresses
    if (isIpAddressLocal(remoteAddress)) return true;

    // Checking if the IP is banned
    if (bannedIps.has(remoteAddress)) return false;

    // Check rate and count request
    const reqsCount = reqsPerIp.get(remoteAddress);
    if (reqsCount !== undefined) {
        const limit = minutesSinceLastAttack < DDOS_COOLDOWN_MINUTES
            ? MAX_RPM_UNDER_ATTACK
            : MAX_RPM_DEFAULT;
        if (reqsCount > limit) {
            bannedIps.add(remoteAddress);
            bansPendingWarn.push(remoteAddress);
            return false;
        }
        reqsPerIp.set(remoteAddress, reqsCount + 1);
    } else {
        reqsPerIp.set(remoteAddress, 1);
    }
    return true;
}

export default checkRateLimit;
