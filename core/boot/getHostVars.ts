import path from 'node:path';
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import fatalError from '@lib/fatalError';
import consts from '@shared/consts';


/**
 * Schemas for the TXHOST_ env variables
 */
export const hostEnvVarSchemas = {
    //General
    API_TOKEN: z.union([
        z.literal('disabled'),
        z.string().regex(
            /^[A-Za-z0-9_-]{16,48}$/,
            'Token must be alphanumeric, underscores or dashes only, and between 16 and 48 characters long.'
        ),
    ]),
    DATA_PATH: z.string().min(1).refine(
        (val) => path.isAbsolute(val),
        'DATA_PATH must be an absolute path'
    ),
    GAME_NAME: z.enum(
        ['fivem', 'redm'],
        { message: 'GAME_NAME must be either "gta5", "rdr3", or undefined' }
    ),
    MAX_SLOTS: z.coerce.number().int().positive(),
    QUIET_MODE: z.preprocess((val) => val === 'true', z.boolean()),

    //Networking
    TXA_URL: z.string().url(),
    TXA_PORT: z.coerce.number().int().positive().refine(
        (val) => val !== 30120,
        'TXA_PORT cannot be 30120'
    ),
    FXS_PORT: z.coerce.number().int().positive().refine(
        (val) => val < 40120 || val > 40150,
        'FXS_PORT cannot be between 40120 and 40150'
    ),
    INTERFACE: z.string().ip(),

    //Provider
    PROVIDER_NAME: z.string()
        .regex(
            /^[a-zA-Z0-9_.\- ]{2,16}$/,
            'Provider name must be between 2 and 16 characters long and can only contain letters, numbers, underscores, periods, hyphens and spaces.'
        )
        .refine(
            x => !/[_.\- ]{2,}/.test(x),
            'Provider name cannot contain consecutive special characters.'
        )
        .refine(
            x => /^[a-zA-Z0-9].*[a-zA-Z0-9]$/.test(x),
            'Provider name must start and end with a letter or number.'
        ),
    PROVIDER_LOGO: z.string().url(),

    //Defaults (no reason to coerce or check, except the cfxkey)
    DEFAULT_DBHOST: z.string(),
    DEFAULT_DBPORT: z.string(),
    DEFAULT_DBUSER: z.string(),
    DEFAULT_DBPASS: z.string(),
    DEFAULT_DBNAME: z.string(),
    DEFAULT_ACCOUNT: z.string().refine(
        (val) => {
            const parts = val.split(':').length;
            return parts === 2 || parts === 3;
        },
        'The account needs to be in the username:fivemId or username:fivemId:bcrypt format',
    ),
    DEFAULT_CFXKEY: z.string().refine(
        //apparently zap still uses the old format?
        (val) => consts.regexSvLicenseNew.test(val) || consts.regexSvLicenseOld.test(val),
        'The key needs to be in the cfxk_xxxxxxxxxxxxxxxxxxxx_yyyyy format'
    ),
} as const;

export type HostEnvVars = {
    [K in keyof typeof hostEnvVarSchemas]: z.infer<typeof hostEnvVarSchemas[K]> | undefined;
}


/**
 * Parses the TXHOST_ env variables
 */
export const getHostVars = () => {
    const txHostEnv: any = {};
    for (const partialKey of Object.keys(hostEnvVarSchemas)) {
        const keySchema = hostEnvVarSchemas[partialKey as keyof HostEnvVars];
        const fullKey = `TXHOST_` + partialKey;
        const value = process.env[fullKey];
        if (value === undefined || value === '') continue;
        if(/^['"]|['"]$/.test(value)) {
            fatalError.GlobalData(20, [
                'Invalid value for a TXHOST environment variable.',
                'The value is surrounded by quotes (" or \'), and you must remove them.',
                'This is likely a mistake in how you declared this env var.',
                ['Key', fullKey],
                ['Value', String(value)],
                'For more information: https://aka.cfx.re/txadmin-env-config',
            ]);
        }
        const res = keySchema.safeParse(value);
        if (!res.success) {
            fatalError.GlobalData(20, [
                'Invalid value for a TXHOST environment variable.',
                ['Key', fullKey],
                ['Value', String(value)],
                'For more information: https://aka.cfx.re/txadmin-env-config',
            ], fromZodError(res.error, { prefix: null }));
        }
        txHostEnv[partialKey] = res.data;
    }
    return txHostEnv as HostEnvVars;
}
