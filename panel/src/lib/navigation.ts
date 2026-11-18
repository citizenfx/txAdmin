import { LogoutReasonHash } from "@/pages/auth/Login";


/**
 * Validates if a redirect path is valid or not.
 * To prevent open redirect, we need to make sure the first char is / and the second is not,
 * otherwise //example.com would be a valid redirect to <proto>://example.com
 */
export function isValidRedirectPath(location: unknown): location is string {
    if (typeof location !== 'string' || !location) return false;
    const url = new URL(location, window.location.href);
    return location.startsWith('/') && !location.startsWith('//') && url.hostname === window.location.hostname;
}


/**
 * Returns the path/search/hash of the login URL with redirect params
 * /aaa/bbb?ccc=ddd#eee -> /login?r=%2Faaa%2Fbbb%3Fccc%3Dddd%23eee
 */
export function redirectToLogin(reasonHash = LogoutReasonHash.NONE) {
    const currLocation = window.location.pathname + window.location.search + window.location.hash;
    const newLocation = currLocation === '/' || currLocation.startsWith('/login')
        ? `/login${reasonHash}`
        : `/login?r=${encodeURIComponent(currLocation)}${reasonHash}`;
    window.history.replaceState(null, '', newLocation);
}


/**
 * Opens a link in a new tab, or calls the native function to open a link in the default browser
 */
export const openExternalLink = (url: string) => {
    if (!url) return;
    if (window.invokeNative) {
        window.invokeNative('openUrl', url);
    } else {
        window.open(url, '_blank');
    }
}


/**
 * Overwrites the href behavior in NUI to open external links
 */
export const handleExternalLinkClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    if (window.txConsts.isWebInterface) return;
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href) return;

    event.preventDefault();
    openExternalLink(href);
}


/**
 * Sets the window URL search param with a given value, or deletes it if value is undefined
 */
export const setUrlSearchParam = (paramName: string, value: string | undefined) => {
    if (typeof paramName !== 'string' || !paramName.length) {
        throw new Error(`setUrlSearchParam: paramName must be a non-empty string`);
    }
    const pageUrl = new URL(window.location.toString());
    if (value) {
        pageUrl.searchParams.set(paramName, value);
    } else {
        pageUrl.searchParams.delete(paramName);
    }
    window.history.replaceState({}, '', pageUrl);
}


/**
 * Gets the window URL search param with a given name
 */
export const getUrlSearchParam = (paramName: string) => {
    if (typeof paramName !== 'string' || !paramName.length) {
        throw new Error(`getUrlSearchParam: paramName must be a non-empty string`);
    }
    const pageUrl = new URL(window.location.toString());
    return pageUrl.searchParams.get(paramName);
}


/**
 * Sets the window URL hash to a given value, or deletes it if value is undefined
 */
export const setUrlHash = (hash: string | undefined) => {
    const pageUrl = new URL(window.location.href);
    if (hash) {
        pageUrl.hash = hash;
    } else {
        pageUrl.hash = '';
    }
    window.history.replaceState(null, '', pageUrl.toString());
}
