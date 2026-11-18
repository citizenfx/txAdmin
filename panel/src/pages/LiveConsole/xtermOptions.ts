import type { ITerminalInitOnlyOptions, ITerminalOptions } from "@xterm/xterm";

export const ScrollbackSizes = {
    SMALL: 2500, //~250kb
    MEDIUM: 5000,//default
    LARGE: 10000,
} as const;

export type ScrollbackSize = typeof ScrollbackSizes[keyof typeof ScrollbackSizes];

export const DensityModes = {
    COMPACT: {
        fontSize: 12,
        lineHeight: 1.0,
        letterSpacing: 0.5,
    },
    COMFORTABLE: {
        fontSize: 14,
        lineHeight: 1.1,
        letterSpacing: 0.8,
    },
    SPACIOUS: {
        fontSize: 16,
        lineHeight: 1.1,
        letterSpacing: 0.8,
    },
} as const;

export type DensityMode = keyof typeof DensityModes;

export const TimestampModes = {
    DEFAULT: 'default',
    FORCE12H: 'force12h',
    FORCE24H: 'force24h',
    DISABLED: 'disabled',
} as const;

export type TimestampMode = keyof typeof TimestampModes;

export type TerminalOptions = {
    density: DensityMode;
    scrollback: ScrollbackSize;
    timestamp: TimestampMode;
    copyTimestamp: boolean;
    copyChannel: boolean;
}

export const terminalDefaultOptions: TerminalOptions = {
    density: 'COMFORTABLE',
    scrollback: ScrollbackSizes.MEDIUM,
    timestamp: 'DEFAULT',
    copyTimestamp: false,
    copyChannel: true,
};

export const xtermOptions: ITerminalOptions | ITerminalInitOnlyOptions = {
    convertEol: true,
    cursorBlink: true,
    cursorStyle: 'bar',
    disableStdin: true,
    drawBoldTextInBrightColors: false,
    fontFamily: "JetBrains Mono Variable, monospace",
    fontWeight: "300",
    fontWeightBold: "600",
    allowProposedApi: true,
    allowTransparency: true,
    overviewRulerWidth: 15,
    ...terminalDefaultOptions,
    ...DensityModes[terminalDefaultOptions.density],
};

export default xtermOptions;
