/**
 * This script makes the live console light theme colors
 * NOTE: The debug part is meant to run in the browser console
 */
type RgbColor = { r: number, g: number, b: number };

//MARK: Dark Colors
//From legacy systemLog.ejs, based on the ANSI-UP colors
//Copy of the one in panel/src/pages/LiveConsole/liveConsoleColors.ts
const ansi16ColorsDark = {
    black: '#000000',
    brightBlack: '#555555',
    red: '#D62341',
    brightRed: '#FF5370',
    green: '#9ECE58',
    brightGreen: '#C3E88D',
    yellow: '#FAED70',
    brightYellow: '#FFCB6B',
    blue: '#396FE2',
    brightBlue: '#82AAFF',
    magenta: '#BB80B3',
    brightMagenta: '#C792EA',
    cyan: '#2DDAFD',
    brightCyan: '#89DDFF',
    white: '#D0D0D0',
    brightWhite: '#FFFFFF',
};


//MARK: Utils
const rgbToHwb = ({ r, g, b }: RgbColor) => {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    let h = 0;
    if (max !== min) {
        if (max === rn) {
            h = 60 * (((gn - bn) / (max - min)) % 6);
        } else if (max === gn) {
            h = 60 * (((bn - rn) / (max - min)) + 2);
        } else {
            h = 60 * (((rn - gn) / (max - min)) + 4);
        }
        if (h < 0) h += 360;
    }
    const w = min;
    const bl = 1 - max;
    return { h, w, b: bl };
};

const hwbToRgb = (h: number, w: number, bl: number) => {
    // Convert HWB to HSV first:
    const v = 1 - bl;
    const s = v === 0 ? 0 : 1 - w / v;

    // Then convert HSV to RGB
    const c = v * s;
    const hh = h / 60;
    const x = c * (1 - Math.abs((hh % 2) - 1));
    let r1 = 0, g1 = 0, b1 = 0;
    if (hh >= 0 && hh < 1) {
        r1 = c; g1 = x; b1 = 0;
    } else if (hh >= 1 && hh < 2) {
        r1 = x; g1 = c; b1 = 0;
    } else if (hh >= 2 && hh < 3) {
        r1 = 0; g1 = c; b1 = x;
    } else if (hh >= 3 && hh < 4) {
        r1 = 0; g1 = x; b1 = c;
    } else if (hh >= 4 && hh < 5) {
        r1 = x; g1 = 0; b1 = c;
    } else if (hh >= 5 && hh < 6) {
        r1 = c; g1 = 0; b1 = x;
    }
    const m = v - c;
    return {
        r: Math.round((r1 + m) * 255),
        g: Math.round((g1 + m) * 255),
        b: Math.round((b1 + m) * 255),
    };
};

const rgbToHex = ({ r, g, b }: RgbColor) => {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

const hexToRgb = (hex: string) => {
    const bigint = parseInt(hex.replace('#', ''), 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}


//MARK: Extended ANSI palette
const ansi256Dark: RgbColor[] = [];
// Color cube: 216 colors from index 16 to 231
for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
        for (let b = 0; b < 6; b++) {
            ansi256Dark.push({
                r: r === 0 ? 0 : r * 40 + 55, // slightly adjusted formula sometimes used
                g: g === 0 ? 0 : g * 40 + 55,
                b: b === 0 ? 0 : b * 40 + 55,
            });
        }
    }
}
// Grayscale ramp: 24 shades from index 232 to 255
for (let i = 0; i < 24; i++) {
    const gray = 8 + i * 10;
    ansi256Dark.push({ r: gray, g: gray, b: gray });
}


//MARK: Computing Colors
const invertHwb = ({ r, g, b }: RgbColor, ansi16 = false) => {
    if (r === g && g === b) {
        // For grayscale colors, directly invert the value
        const newK = 255 - r;
        const bgCardOffset = 13.3333333333; //255-((240+241+244)/3)
        const clampedK = Math.round(Math.min(255, Math.max(bgCardOffset, newK)));
        return { r: clampedK, g: clampedK, b: clampedK };
    }
    let { h, w, b: bl } = rgbToHwb({ r, g, b });
    const factors = ansi16
        ? { w: 0.1, b: 0.2 } //timestamp, info marker, normal text, most ^n colors
        : { w: 0.2, b: 0.35 }; //channel tags, other markers
    const newW = w * factors.w;
    const newB = bl + (1 - bl) * factors.b;
    return hwbToRgb(h, newW, newB);
};


const ansi256Light: RgbColor[] = ansi256Dark.map(color => invertHwb(color));
const ansi256LightHex = ansi256Light.map(rgbToHex);
const ansi16ColorsLight = Object.fromEntries(
    Object.entries(ansi16ColorsDark).map(([key, value]) => [key, rgbToHex(invertHwb(hexToRgb(value), true))])
);


//MARK: Debug
const getConsoleStyle = (bg: string, fg = 'black') => `background-color: ${bg}; color: ${fg}; padding: 0.5em;`;
const bgResetStyle = 'background-color: white';
// console.clear();
const baseColorsDark = {
    background: '#222326', //card bg
    foreground: '#F8F8F8', //primary
}
const baseColorsLight = {
    background: '#F0F1F4', //card bg
    foreground: '#16171B', //primary
}

//Debugging background colors
for (let index = 0; index < 240; index++) {
    if (index % 10 !== 0) continue;
    const before = rgbToHex(ansi256Dark[index]);
    const after = rgbToHex(ansi256Light[index]);
    const space = ' '.repeat(10);
    const bgString = `%c${space}%c %c${space}`;
    const fgString = `%clorem ipsum%c %clorem ipsum`;
    console.log(
        `${index+16}\tbg:${bgString}%c\tfg:${fgString}`,
        getConsoleStyle(before),
        bgResetStyle,
        getConsoleStyle(after),
        bgResetStyle,

        getConsoleStyle(baseColorsDark.background, before),
        bgResetStyle,
        getConsoleStyle(baseColorsLight.background, after),
        {before, after}
    );
}


//MARK: Converting
// // Find the nearest ANSI 256 color for a given RGB
// const rgbToAnsi256 = ({ r, g, b }: RgbColor) => {
//     let bestIndex = 0;
//     let bestDistance = Infinity;
//     for (let i = 0; i < ansi256Dark.length; i++) {
//         const color = ansi256Dark[i];
//         const dr = r - color.r;
//         const dg = g - color.g;
//         const db = b - color.b;
//         const distance = dr * dr + dg * dg + db * db;
//         if (distance < bestDistance) {
//             bestDistance = distance;
//             bestIndex = i;
//         }
//     }
//     return bestIndex;
// };

// const ogColorHex = '#E6B863';
// const ogColorRgb = hexToRgb(ogColorHex);

// //Find best match for background colors
// console.group('Matching Colors:');
// for (let index = 0; index < 240; index++) {
//     const before = rgbToHex(ansi256Dark[index]);
//     const after = rgbToHex(ansi256Light[index]);
//     console.log(
//         `${index + 16}\t%c${ogColorHex}%c\t%c${before}%c\t%c${after}%c\t%clorem ipsum`,
//         getConsoleStyle(ogColorHex),
//         bgResetStyle,
//         getConsoleStyle(before),
//         bgResetStyle,
//         getConsoleStyle(after),
//         bgResetStyle,
//         `background-color: ${baseColorsLight.background}; color: ${after}; padding: 0.5em;`,
//     );
// }
// console.groupEnd();

// const matchIndex = rgbToAnsi256(ogColorRgb);
// const matchColorDark = ansi256Dark[matchIndex];
// const matchColorDarkHex = rgbToHex(matchColorDark);
// const matchColorLight = ansi256Light[matchIndex];
// const matchColorLightHex = rgbToHex(matchColorLight);

// console.group(`Converting ${ogColorHex} to ANSI 256`);
// console.log(
//     `${matchIndex + 16}\t%c${ogColorHex}%c\t%c${matchColorDarkHex}%c\t%c${matchColorLightHex}`,
//     getConsoleStyle(ogColorHex),
//     bgResetStyle,
//     getConsoleStyle(matchColorDarkHex),
//     bgResetStyle,
//     getConsoleStyle(matchColorLightHex),
// );
// console.groupEnd();
