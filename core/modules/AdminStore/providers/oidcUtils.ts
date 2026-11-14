import consts from '@shared/consts';

const MAX_NAME_LENGTH = 20;
const FALLBACK_NAME = 'sso_user';


/**
 * Converts an arbitrary IdP username/email into a valid txAdmin admin name.
 * Rules: 3-20 chars, only letters, numbers and `_.-`, must start and end with a word char.
 */
export const sanitizeOidcUsername = (input: unknown) => {
    if (typeof input !== 'string') return FALLBACK_NAME;
    let name = input.trim();
    if (name.includes('@')) name = name.split('@')[0];
    name = name
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '') //strip diacritics
        .replace(/[^\w.-]+/g, '_')
        .replace(/([^a-zA-Z0-9])[^a-zA-Z0-9]+/g, '$1') //no repeated non-alphanum chars
        .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '')
        .substring(0, MAX_NAME_LENGTH)
        .replace(/[^a-zA-Z0-9]+$/g, '');
    if (!consts.regexValidFivemUsername.test(name)) return FALLBACK_NAME;
    return name;
}


/**
 * Returns the first name not taken by appending a numeric suffix if needed.
 */
export const findAvailableAdminName = (baseName: string, isTaken: (name: string) => boolean) => {
    if (!isTaken(baseName)) return baseName;
    for (let i = 2; i < 1000; i++) {
        const suffix = `_${i}`;
        const candidate = baseName.substring(0, MAX_NAME_LENGTH - suffix.length).replace(/[^a-zA-Z0-9]+$/g, '') + suffix;
        if (!isTaken(candidate)) return candidate;
    }
    throw new Error('Could not find an available username.');
}


/**
 * Checks if the claims satisfy the required claim filter.
 * The claim value can be a string, number, boolean or an array of those (eg. groups/roles).
 */
export const checkRequiredClaim = (
    claims: Record<string, unknown>,
    requiredClaim: string | null,
    requiredValue: string | null,
) => {
    if (!requiredClaim) return true;
    const claimValue = claims[requiredClaim];
    if (claimValue === undefined || claimValue === null) return false;
    if (!requiredValue) return true;
    const values = Array.isArray(claimValue) ? claimValue : [claimValue];
    return values.some((v) => String(v) === requiredValue);
}
