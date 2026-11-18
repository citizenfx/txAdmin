import type { PlayerIdsObjectType } from "@shared/otherTypes";
import consts from "@shared/consts";
import { shortenId } from "@shared/utils";


/**
 * Validates a single identifier and return its parts lowercased
 */
export const parsePlayerId = (idString: string) => {
    if (typeof idString !== 'string') {
        return { isIdValid: false, idType: null, idValue: null, idlowerCased: null };
    }

    const idlowerCased = idString.toLocaleLowerCase();
    const [idType, idValue] = idlowerCased.split(':', 2);
    const validator = consts.validIdentifiers[idType as keyof typeof consts.validIdentifiers];
    if (validator && validator.test(idlowerCased)) {
        return { isIdValid: true, idType, idValue, idlowerCased };
    } else {
        return { isIdValid: false, idType, idValue, idlowerCased };
    }
}


/**
 * Get valid, invalid and license identifier from array of ids
 */
export const parsePlayerIds = (ids: string[]) => {
    let invalidIdsArray: string[] = [];
    let validIdsArray: string[] = [];
    const validIdsObject: PlayerIdsObjectType = {
        discord: null,
        fivem: null,
        license: null,
        license2: null,
        live: null,
        steam: null,
        xbl: null,
    }

    for (const idString of ids) {
        if (typeof idString !== 'string') continue;
        const { isIdValid, idType, idValue } = parsePlayerId(idString);
        if (isIdValid) {
            validIdsArray.push(idString);
            validIdsObject[idType as keyof PlayerIdsObjectType] = idValue;
        } else {
            invalidIdsArray.push(idString);
        }
    }

    return { invalidIdsArray, validIdsArray, validIdsObject };
}


/**
 * Get valid and invalid player HWIDs
 */
export const filterPlayerHwids = (hwids: string[]) => {
    let invalidHwidsArray: string[] = [];
    let validHwidsArray: string[] = [];

    for (const hwidString of hwids) {
        if (typeof hwidString !== 'string') continue;
        if (consts.regexValidHwidToken.test(hwidString)) {
            validHwidsArray.push(hwidString);
        } else {
            invalidHwidsArray.push(hwidString);
        }
    }

    return { invalidHwidsArray, validHwidsArray };
}


/**
 * Attempts to parse a user-provided string into an array of valid identifiers.
 * This function is lenient and will attempt to parse any string into an array of valid identifiers.
 * For non-prefixed ids, it will attempt to parse it as discord, fivem, steam, or license.
 * Returns an array of valid ids/hwids, and array of invalid identifiers.
 * 
 * Stricter version of this function is parsePlayerIds
 */
export const parseLaxIdsArrayInput = (fullInput: string) => {
    const validIds: string[] = [];
    const validHwids: string[] = [];
    const invalids: string[] = [];

    if (typeof fullInput !== 'string') {
        return { validIds, validHwids, invalids };
    }
    const inputs = fullInput.toLowerCase().split(/[,;\s]+/g).filter(Boolean);

    for (const input of inputs) {
        if (input.includes(':')) {
            if (consts.regexValidHwidToken.test(input)) {
                validHwids.push(input);
            } else if (Object.values(consts.validIdentifiers).some((regex) => regex.test(input))) {
                validIds.push(input);
            } else {
                const [type, value] = input.split(':', 1);
                if (consts.validIdentifierParts[type as keyof typeof consts.validIdentifierParts]?.test(value)) {
                    validIds.push(input);
                } else {
                    invalids.push(input);
                }
            }
        } else if (consts.validIdentifierParts.discord.test(input)) {
            validIds.push(`discord:${input}`);
        } else if (consts.validIdentifierParts.fivem.test(input)) {
            validIds.push(`fivem:${input}`);
        } else if (consts.validIdentifierParts.license.test(input)) {
            validIds.push(`license:${input}`);
        } else if (consts.validIdentifierParts.steam.test(input)) {
            validIds.push(`steam:${input}`);
        } else {
            invalids.push(input);
        }
    }

    return { validIds, validHwids, invalids };
}


/**
 * Extracts the fivem:xxxxxx identifier from the nameid field from the userInfo oauth response.
 * Example: https://forum.cfx.re/internal/user/271816 -> fivem:271816
 */
export const getIdFromOauthNameid = (nameid: string) => {
    try {
        const res = /\/user\/(\d{1,8})/.exec(nameid);
        //@ts-expect-error
        return `fivem:${res[1]}`;
    } catch (error) {
        return false;
    }
}


/**
 * Returns a string of shortened IDs/HWIDs
 */
export const summarizeIdsArray = (ids: string[]) => {
    if (!Array.isArray(ids)) return '<invalid list>';
    if (ids.length === 0) return '<empty list>';
    const shortList = ids.map(id => shortenId(id)).join(', ');
    return `[${shortList}]`;
}
