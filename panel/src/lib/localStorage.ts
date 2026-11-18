/*
    FIXME:NEXT:UPDATE REMOVE OLD KEYS
    - dynamic:
        - dynamicNewFeatTs-*
        - txa:img-cache:*
    - static:
        - txa:last-error-reload
        - tsUpdateDismissed
        - playerSearchRememberType
        - authCredsAutofill
    - atomWithStorage:
        - liveConsoleOptions
        - liveConsoleCommandHistory
        - liveConsoleCommandBookmarks
*/

/*
    FIXME: legacy page keys to remove:
    - eventFilters
    - resourcesPageCollapsedGroups
    - resourcesPageFilter
    - resourcesPageShowDefault
*/

/**
 * Centralized storage key list for better organization.
 */
export enum LocalStorageKey {
    // Prefixes-only
    // ImgCache = 'txa:imgCache:', //NOTE: not yet used
    NewFeatureSeenTs = 'txa:newFeat:seenTs:',

    // static
    ErrorFallbackLastReload = 'txa:errorFallback:lastReload',
    UpdateWarningPostponedTs = 'txa:updateWarning:postponedTs',
    PlayersPageSearchType = 'txa:playersPage:searchType',
    AuthCredsAutofill = 'txa:authCreds:autofill',

    // atomWithStorage
    LiveConsoleBookmarks = 'txa:liveConsole:bookmarks',
    LiveConsoleHistory = 'txa:liveConsole:history',
    LiveConsoleOptions = 'txa:liveConsole:options',
}


/**
 * Migrate old storage keys to the new ones, and wipe the old ones.
 * FIXME:NEXT:UPDATE REMOVE OLD KEYS
 */
export const migrateStorageKeys = () => {
    const migrateKey = (oldKey: string, newKey: string) => {
        try {
            const newValue = localStorage.getItem(newKey);
            const oldValue = localStorage.getItem(oldKey);
            if (!newValue && oldValue) {
                localStorage.setItem(newKey, oldValue);
                localStorage.removeItem(oldKey);
            }
        } catch (error) { }
    }
    migrateKey('txa:last-error-reload', LocalStorageKey.ErrorFallbackLastReload);
    migrateKey('tsUpdateDismissed', LocalStorageKey.UpdateWarningPostponedTs);
    migrateKey('playerSearchRememberType', LocalStorageKey.PlayersPageSearchType);
    migrateKey('authCredsAutofill', LocalStorageKey.AuthCredsAutofill);
    migrateKey('liveConsoleCommandBookmarks', LocalStorageKey.LiveConsoleBookmarks);
    migrateKey('liveConsoleCommandHistory', LocalStorageKey.LiveConsoleHistory);
    
    //Wipe old dynamic keys
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        try {
            if (key.startsWith('dynamicNewFeatTs-') || key.startsWith('txa:img-cache:')) {
                localStorage.removeItem(key);
            }
        } catch (error) { }
    }
}


/**
 * Creates a Jotai-compatible storage for arbitrary values.
 * Check how it's used in the LiveConsole hooks.
 */
export const createValidatedStorage = <T>(validator: (value: unknown) => T, defaultValue: T) => {
    return {
        getItem: (key: string): T => {
            const storedValue = localStorage.getItem(key);
            if (!storedValue) return defaultValue;
            try {
                const parsedValue = JSON.parse(storedValue);
                return validator(parsedValue);
            } catch (error) {
                return defaultValue;
            }
        },
        setItem: (key: string, value: T): void => {
            const validatedValue = validator(value);
            localStorage.setItem(key, JSON.stringify(validatedValue));
        },
        removeItem: (key: string): void => {
            localStorage.removeItem(key);
        },
    };
};


/**
 * Ensures that the value is an array of strings.
 */
export const validateStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
};
