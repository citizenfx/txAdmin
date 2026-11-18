import type { ITheme } from "@xterm/xterm";


//MARK: ANSI Codes
export const ANSI = {
    ORANGE: '\x1B[1;38;5;202m', //console cleared message
    TS_STRONG: '\x1B[1;37m', //bold white
    TS_WEAK: '\x1B[2;37m', //faint white
    RESET: '\x1B[0m',
} as const;


//MARK: Dark Theme
//From legacy systemLog.ejs, based on the ANSI-UP colors
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

const baseColorsDark = {
    background: '#222326', //card bg
    foreground: '#F8F8F8', //primary
}

export const darkThemeColors: ITheme = {
    ...baseColorsDark,
    ...ansi16ColorsDark,
};


//MARK: Light Theme
//NOTE: Colors generated from scripts/dev/makeConsoleLightTheme.ts
const ansi16ColorsLight = {
    black: "#FFFFFF",
    brightBlack: "#AAAAAA",
    red: "#AB0420",
    brightRed: "#CC0829",
    green: "#65A509",
    brightGreen: "#74BA0E",
    yellow: "#C8B60B",
    brightYellow: "#CC880B",
    blue: "#063EB5",
    brightBlue: "#0D4ACC",
    magenta: "#960D83",
    brightMagenta: "#770FBB",
    cyan: "#05A9CA",
    brightCyan: "#0E95CC",
    white: "#2F2F2F",
    brightWhite: "#0D0D0D"
};

const ansi256LightHex = ["#FFFFFF", "#00003E", "#000058", "#000072", "#00008C", "#0000A6", "#003E00", "#003E3E", "#003E58", "#003E72", "#003E8C", "#003EA6", "#005800", "#00583E", "#005858", "#005872", "#00588C", "#0058A6", "#007200", "#00723E", "#007258", "#007272", "#00728C", "#0072A6", "#008C00", "#008C3E", "#008C58", "#008C72", "#008C8C", "#008CA6", "#00A600", "#00A63E", "#00A658", "#00A672", "#00A68C", "#00A6A6", "#3E0000", "#3E003E", "#3E0058", "#3E0072", "#3E008C", "#3E00A6", "#3E3E00", "#A0A0A0", "#131358", "#131372", "#13138C", "#1313A6", "#3E5800", "#135813", "#135858", "#134272", "#133B8C", "#1338A6", "#3E7200", "#137213", "#137242", "#137272", "#13638C", "#135CA6", "#3E8C00", "#138C13", "#138C3B", "#138C63", "#138C8C", "#1381A6", "#3EA600", "#13A613", "#13A638", "#13A65C", "#13A681", "#13A6A6", "#580000", "#58003E", "#580058", "#580072", "#58008C", "#5800A6", "#583E00", "#581313", "#581358", "#421372", "#3B138C", "#3813A6", "#585800", "#585813", "#787878", "#1B1B72", "#1B1B8C", "#1B1BA6", "#587200", "#427213", "#1B721B", "#1B7272", "#1B538C", "#1B49A6", "#588C00", "#3B8C13", "#1B8C1B", "#1B8C53", "#1B8C8C", "#1B77A6", "#58A600", "#38A613", "#1BA61B", "#1BA649", "#1BA677", "#1BA6A6", "#720000", "#72003E", "#720058", "#720072", "#72008C", "#7200A6", "#723E00", "#721313", "#721342", "#721372", "#64138C", "#5C13A6", "#725800", "#724213", "#721B1B", "#721B72", "#531B8C", "#491BA6", "#727200", "#727213", "#72721B", "#505050", "#23238C", "#2323A6", "#728C00", "#638C13", "#538C1B", "#238C23", "#238C8C", "#2364A6", "#72A601", "#5CA613", "#49A61B", "#23A623", "#23A664", "#23A6A6", "#8C0000", "#8C003E", "#8C0058", "#8C0072", "#8C008C", "#8C00A6", "#8C3E00", "#8C1313", "#8C133B", "#8C1364", "#8C138C", "#8113A6", "#8C5800", "#8C3B13", "#8C1B1B", "#8C1B53", "#8C1B8c", "#781BA6", "#8C7200", "#8C6413", "#8C531B", "#8C2323", "#8C238C", "#6423A6", "#8C8C00", "#8C8C13", "#8C8C1B", "#8C8C23", "#282828", "#2B2BA6", "#8CA600", "#81A613", "#77A61B", "#64A623", "#2BA62B", "#2BA6A6", "#A60000", "#A6003E", "#A60058", "#A60072", "#A6008C", "#A600A6", "#A63E00", "#A61313", "#A61338", "#A6135C", "#A61381", "#A613A6", "#A65800", "#A63813", "#A61B1B", "#A61B49", "#A61B78", "#A61BA6", "#A67200", "#A65C13", "#A6491B", "#A62323", "#A62364", "#A623A6", "#A68C00", "#A68113", "#A6781B", "#A66423", "#A62B2B", "#A62BA6", "#A6A600", "#A6A613", "#A6A61B", "#A6A623", "#A6A62B", "#0D0D0D", "#F7F7F7", "#EDEDED", "#E3E3E3", "#D9D9D9", "#CFCFCF", "#C5C5C5", "#BBBBBB", "#B1B1B1", "#A7A7A7", "#9D9D9D", "#939393", "#898989", "#7F7F7F", "#757575", "#6B6B6B", "#616161", "#575757", "#4D4D4D", "#434343", "#393939", "#2F2F2F", "#252525", "#1B1B1B", "#111111"];

const baseColorsLight = {
    background: '#F0F1F4', //card bg
    foreground: '#16171B', //primary
}

export const lightThemeColors: ITheme = {
    ...baseColorsLight,
    ...ansi16ColorsLight,
    extendedAnsi: ansi256LightHex,
};
