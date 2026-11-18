import { arrayRandom } from './miscUtils';

type ShortcutDataType = {
    easterEgg: string | false;
    default: string[]
}
type ShortcutsDataType = Record<string, ShortcutDataType>

const fivemShortcuts: ShortcutsDataType = {
    car: {
        easterEgg: 'caddy',
        default: ['comet2', 'coquette', 'trophytruck', 'issi5', 'f620', 'nero', 'sc1', 'toros', 'tyrant'],
    },
    bike: {
        easterEgg: 'bmx',
        default: ['esskey', 'nemesis', 'sanchez'],
    },
    heli: {
        easterEgg: 'havok',
        default: ['buzzard2', 'volatus'],
    },
    boat: {
        easterEgg: 'seashark',
        default: ['dinghy', 'toro2'],
    },
};

const redmShortcuts: ShortcutsDataType = {
    horse: {
        easterEgg: 'a_c_horsemulepainted_01',
        default: ['a_c_horse_arabian_redchestnut', 'a_c_horse_turkoman_perlino', 'a_c_horse_missourifoxtrotter_buckskinbrindle'],
    },
    buggy: {
        easterEgg: false,
        default: ['buggy01', 'buggy02', 'buggy03'],
    },
    coach: {
        easterEgg: false,
        default: ['coach2', 'coach3', 'coach4', 'coach5', 'coach6'],
    },
    canoe: {
        easterEgg: 'rowboat',
        default: ['canoe', 'pirogue', 'pirogue2'],
    },
};

/**
 * Returns the input string or replaces it with a random vehicle shortcut
 */
export const vehiclePlaceholderReplacer = (vehInput: string, shortcutsData: ShortcutsDataType) => {
    let modelName = vehInput.trim().toLowerCase();
    let isShortcut = false;
    if (modelName in shortcutsData) {
        isShortcut = true;
        const shortcut = shortcutsData[modelName as keyof typeof shortcutsData];
        if (shortcut.easterEgg && Math.random() < 0.05) {
            modelName = shortcut.easterEgg;
        } else {
            modelName = arrayRandom(shortcut.default);
        }
    }

    return { modelName, isShortcut };
}

/**
 * Returns the appropriate vehicle shortcut data for a given game
 */
export const getVehicleSpawnDialogData = (isRedm: boolean) => ({
    shortcuts: isRedm ? Object.keys(redmShortcuts) : Object.keys(fivemShortcuts),
    shortcutsData: isRedm ? redmShortcuts : fivemShortcuts,
})
