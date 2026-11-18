import consts from '@shared/consts';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';


/**
 * Constants
 */
const root = window.document.documentElement;
const availableCustomThemes = window.txConsts.customThemes.map((theme) => theme.name);
const customThemesClasses = window.txConsts.customThemes.map((theme) => `theme-${theme.name}`);
const defaultThemes = ['dark', 'light'];
const initialAtomValue = availableCustomThemes.find((name) => root.classList.contains(`theme-${name}`))
    ?? defaultThemes.find((name) => root.classList.contains(name))
    ?? window.txConsts.defaultTheme;


/**
 * Helpers
 */
const setThemeCookieValue = (value: string) => {
    document.cookie = `${consts.cookies.theme}=${value};path=/;SameSite=Lax;max-age=31536000;`;
}

const parseTheme = (themeName: string) => {
    if (defaultThemes.includes(themeName)) {
        return {
            isInvalid: false,
            isDefault: true,
            isDarkScheme: themeName === 'dark',
            lightDarkClass: themeName,
            customClass: undefined,
        }
    } else if (availableCustomThemes.includes(themeName)) {
        const customTheme = window.txConsts.customThemes.find((theme) => theme.name === themeName);
        if (customTheme) {
            const isDarkScheme = customTheme.isDark;
            return {
                isInvalid: false,
                isDefault: false,
                isDarkScheme,
                lightDarkClass: isDarkScheme ? 'dark' : 'light',
                customClass: `theme-${themeName}`,
            }
        }
    }

    console.warn(`Could not find theme'${themeName}', defaulting to dark.`);
    return {
        isInvalid: true,
        isDefault: false,
        isDarkScheme: true,
        lightDarkClass: 'dark',
        customClass: undefined,
    }
}


/**
 * Atom
 */
const themeAtom = atom(initialAtomValue);
const isDarkModeAtom = atom((get) => {
    const currTheme = get(themeAtom);
    return parseTheme(currTheme).isDarkScheme;
});

//Resetting cookie to a valid value + refreshing expiration
setThemeCookieValue(initialAtomValue);


/**
 * Theme changer
 */
const applyNewTheme = (oldTheme: string, newTheme: string) => {
    const { isInvalid, isDefault, isDarkScheme, lightDarkClass, customClass } = parseTheme(newTheme);
    if (isInvalid) {
        throw new Error(`invalid theme ${newTheme}`);
    }

    //Applying classes
    root.classList.remove(...defaultThemes, ...customThemesClasses);
    root.classList.add(lightDarkClass);
    if (customClass) {
        root.classList.add(customClass);
    }

    //Changing iframe theme
    const iframeBody = (document.getElementById('legacyPageIframe') as HTMLObjectElement)?.contentDocument?.body;
    if (iframeBody) {
        if (isDarkScheme) {
            iframeBody.classList.add('theme--dark');
        } else {
            iframeBody.classList.remove('theme--dark');
        }
    }

    setThemeCookieValue(newTheme);
    console.log(`Changed theme from '${oldTheme}' to '${newTheme}'.`);
}


/**
 * Hooks
 */
export const useTheme = () => {
    const [atomTheme, setAtomTheme] = useAtom(themeAtom);

    //Theme setter
    const setTheme = (newTheme: string) => {
        if (newTheme === atomTheme) return;
        applyNewTheme(atomTheme, newTheme);
        setAtomTheme(newTheme);
    }

    return {
        theme: atomTheme,
        setTheme,
    }
};

export const useToggleTheme = () => {
    const setTheme = useSetAtom(themeAtom);
    return () => setTheme((curr) => {
        if (curr === 'dark') {
            applyNewTheme(curr, 'light');
            return 'light';
        } else if (curr === 'light') {
            applyNewTheme(curr, 'dark');
            return 'dark';
        } else {
            console.log('invalid theme', curr);
            return curr;
        }
    });
}

export const useIsDarkMode = () => {
    return useAtomValue(isDarkModeAtom);
}

export const useThemedImage = (baseImageUrl?: string) => {
    const isDarkMode = useAtomValue(isDarkModeAtom);
    if(typeof baseImageUrl !== 'string') return;
    return baseImageUrl.replace(/{theme}/g, isDarkMode ? 'dark' : 'light');
}
