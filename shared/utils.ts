/**
 * Shortens an ID/HWID string to just leading and trailing characters.
 * Unicode symbol alternatives: ‥,…,~,≈,-,•,◇
 */
export const shortenId = (id: string, numChars = 4) => {
    if (typeof id !== 'string') throw new Error(`id is not a string`);
    if (typeof numChars !== 'number' || numChars < 3) throw new Error(`numChars must be a number >= 3`);
    
    const [idType, idValue] = id.split(':', 2);
    if (!idType || !idValue) {
        return id; // Invalid format, return as is
    }
    
    const threshold = numChars * 2 + 2;
    if (idValue.length <= threshold) {
        return id; // Do not shorten if ID value is threshold characters or fewer
    }
    
    const start = idValue.slice(0, numChars);
    const end = idValue.slice(-numChars);
    return `${idType}:${start}…${end}`;
}
