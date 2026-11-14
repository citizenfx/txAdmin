import { z } from "zod";
import { typeDefinedConfig } from "./utils";
import { SYM_FIXER_DEFAULT } from "@lib/symbols";
import { parseSchedule, regexHoursMinutes } from "@lib/misc";

export const polishScheduleTimesArray = (input: string[]) => {
    return parseSchedule(input).valid.map((v) => v.string);
};

const schedule = typeDefinedConfig({
    name: 'Restart Schedule',
    default: [],
    validator: z.string().regex(regexHoursMinutes).array().transform(polishScheduleTimesArray),
    fixer: (input: any) => {
        if(!Array.isArray(input)) return [];
        return polishScheduleTimesArray(input);
    },
});

const bootGracePeriod = typeDefinedConfig({
    name: 'Boot Grace Period',
    default: 45,
    validator: z.number().int().min(15),
    fixer: SYM_FIXER_DEFAULT,
});

const resourceStartingTolerance = typeDefinedConfig({
    name: 'Resource Starting Tolerance',
    default: 90,
    validator: z.number().int().min(30),
    fixer: SYM_FIXER_DEFAULT,
});

const updateFileEnabled = typeDefinedConfig({
    name: 'Auto-Restart on Update File',
    default: false,
    validator: z.boolean(),
    fixer: SYM_FIXER_DEFAULT,
});

const updateFileName = typeDefinedConfig({
    name: 'Update File Name',
    default: '.update',
    validator: z.string().trim().min(1).max(255),
    fixer: SYM_FIXER_DEFAULT,
});

const updateFileDelay = typeDefinedConfig({
    name: 'Update File Restart Delay',
    default: 2, //minutes
    validator: z.number().int().min(1).max(1439),
    fixer: SYM_FIXER_DEFAULT,
});


export default {
    schedule,
    bootGracePeriod,
    resourceStartingTolerance,
    updateFileEnabled,
    updateFileName,
    updateFileDelay,
} as const;
