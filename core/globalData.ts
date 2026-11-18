import os from 'node:os';
import fsp from 'node:fs/promises';
import path from 'node:path';
import slash from 'slash';

import consoleFactory, { setConsoleEnvData } from '@lib/console';
import { addLocalIpAddress } from '@lib/host/isIpAddressLocal';
import { parseFxserverVersion } from '@lib/fxserver/fxsVersionParser';
import { parseTxDevEnv, TxDevEnvType } from '@shared/txDevEnv';
import { Overwrite } from 'utility-types';
import fatalError from '@lib/fatalError';
import { getNativeVars } from './boot/getNativeVars';
import { getHostVars, hostEnvVarSchemas } from './boot/getHostVars';
import { getZapVars } from './boot/getZapVars';
import { z, ZodSchema } from 'zod';
import { fromZodError } from 'zod-validation-error';
import consts from '@shared/consts';
import chalk from 'chalk';
const console = consoleFactory();


/**
 * MARK: GETTING VARIABLES
 */
//Get OSType
const osTypeVar = os.type();
let isWindows;
if (osTypeVar === 'Windows_NT') {
    isWindows = true;
} else if (osTypeVar === 'Linux') {
    isWindows = false;
} else {
    fatalError.GlobalData(0, `OS type not supported: ${osTypeVar}`);
}

//Simple env vars
const ignoreDeprecatedConfigs = process.env?.TXHOST_IGNORE_DEPRECATED_CONFIGS === 'true';


/**
 * MARK: HELPERS
 */
const cleanPath = (x: string) => slash(path.normalize(x));
const handleMultiVar = <T extends ZodSchema>(
    name: string,
    schema: T,
    procenv: z.infer<T> | undefined,
    zapcfg: string | number | undefined,
    convar: any,
): z.infer<T> | undefined => {
    const alt = zapcfg ?? convar;
    if (alt === undefined) {
        return procenv;
    }
    const whichAlt = zapcfg !== undefined ? 'txAdminZapConfig.json' : 'ConVar';
    if (procenv !== undefined) {
        console.warn(`WARNING: Both the environment variable 'TXHOST_${name}' and the ${whichAlt} equivalent are set. The environment variable will be prioritized.`);
        return procenv;
    }
    const parsed = schema.safeParse(alt);
    if (!parsed.success) {
        fatalError.GlobalData(20, [
            `Invalid value for the TXHOST_${name}-equivalent config in ${whichAlt}.`,
            ['Value', alt],
            'For more information: https://aka.cfx.re/txadmin-env-config',
        ], fromZodError(parsed.error, { prefix: null }));
    }
    return parsed.data;
}


/**
 * MARK: DEV ENV
 */
type TxDevEnvEnabledType = Overwrite<TxDevEnvType, {
    ENABLED: true;
    SRC_PATH: string, //required in core/webserver, core/getReactIndex.ts
    VITE_URL: string, //required in core/getReactIndex.ts
}>;
type TxDevEnvDisabledType = Overwrite<TxDevEnvType, {
    ENABLED: false;
    SRC_PATH: undefined;
    VITE_URL: undefined;
}>;
let _txDevEnv: TxDevEnvEnabledType | TxDevEnvDisabledType;
const devVars = parseTxDevEnv();
if (devVars.ENABLED) {
    console.debug('Starting txAdmin in DEV mode.');
    if (!devVars.SRC_PATH || !devVars.VITE_URL) {
        fatalError.GlobalData(8, 'Missing TXDEV_VITE_URL and/or TXDEV_SRC_PATH env variables.');
    }
    _txDevEnv = devVars as TxDevEnvEnabledType;
} else {
    _txDevEnv = {
        ...devVars,
        SRC_PATH: undefined,
        VITE_URL: undefined,
    } as TxDevEnvDisabledType;
}


/**
 * MARK: CHECK HOST VARS
 */
const nativeVars = getNativeVars(ignoreDeprecatedConfigs);

//Getting fxserver version
//4380 = GetVehicleType was exposed server-side
//4548 = more or less when node v16 was added
//4574 = add missing PRINT_STRUCTURED_TRACE declaration
//4574 = add resource field to PRINT_STRUCTURED_TRACE
//5894 = CREATE_VEHICLE_SERVER_SETTER
//6185 = added ScanResourceRoot (not yet in use)
//6508 = unhandledRejection is now handlable, we need this due to discord.js's bug
//8495 = changed prometheus::Histogram::BucketBoundaries
//9423 = feat(server): add more infos to playerDropped event
//9655 = Fixed ScanResourceRoot + latent events
const minFxsVersion = 5894;
const fxsVerParsed = parseFxserverVersion(nativeVars.fxsVersion);
const fxsVersion = fxsVerParsed.valid ? fxsVerParsed.build : 99999;
if (!fxsVerParsed.valid) {
    console.error('It looks like you are running a custom build of fxserver.');
    console.error('And because of that, there is no guarantee that txAdmin will work properly.');
    console.error(`Convar: ${nativeVars.fxsVersion}`);
    console.error(`Parsed Build: ${fxsVerParsed.build}`);
    console.error(`Parsed Branch: ${fxsVerParsed.branch}`);
    console.error(`Parsed Platform: ${fxsVerParsed.platform}`);
} else if (fxsVerParsed.build < minFxsVersion) {
    fatalError.GlobalData(2, [
        'This version of FXServer is too outdated and NOT compatible with txAdmin',
        ['Current FXServer version', fxsVerParsed.build.toString()],
        ['Minimum required version', minFxsVersion.toString()],
        'Please update your FXServer to a newer version.',
    ]);
} else if (fxsVerParsed.branch !== 'master') {
    console.warn(`You are running a custom branch of FXServer: ${fxsVerParsed.branch}`);
}

//Getting txAdmin version
if (!nativeVars.txaResourceVersion) {
    fatalError.GlobalData(3, [
        'txAdmin version not set or in the wrong format.',
        ['Detected version', nativeVars.txaResourceVersion],
    ]);
}
const txaVersion = nativeVars.txaResourceVersion;

//Get txAdmin Resource Path
if (!nativeVars.txaResourcePath) {
    fatalError.GlobalData(4, [
        'Could not resolve txAdmin resource path.',
        ['Convar', nativeVars.txaResourcePath],
    ]);
}
const txaPath = cleanPath(nativeVars.txaResourcePath);

//Get citizen Root
if (!nativeVars.fxsCitizenRoot) {
    fatalError.GlobalData(5, [
        'citizen_root convar not set',
        ['Convar', nativeVars.fxsCitizenRoot],
    ]);
}
const fxsPath = cleanPath(nativeVars.fxsCitizenRoot as string);

//Check if server is inside WinRar's temp folder
if (isWindows && /Temp[\\/]+Rar\$/i.test(fxsPath)) {
    fatalError.GlobalData(12, [
        'It looks like you ran FXServer inside WinRAR without extracting it first.',
        'Please extract the server files to a proper folder before running it.',
        ['Server path', fxsPath.replace(/\\/g, '/').replace(/\/$/, '')],
    ]);
}


//Setting the variables in console without it having to importing from here (circular dependency)
setConsoleEnvData(
    txaVersion,
    txaPath,
    _txDevEnv.ENABLED,
    _txDevEnv.VERBOSE
);


/**
 * MARK: TXDATA & PROFILE 
 */
const hostVars = getHostVars();
//Setting data path
let hasCustomDataPath = false;
let dataPath = cleanPath(path.join(
    fxsPath,
    isWindows ? '..' : '../../../',
    'txData'
));
const dataPathVar = handleMultiVar(
    'DATA_PATH',
    hostEnvVarSchemas.DATA_PATH,
    hostVars.DATA_PATH,
    undefined,
    nativeVars.txDataPath,
);
if (dataPathVar) {
    hasCustomDataPath = true;
    dataPath = cleanPath(dataPathVar);
}

//Check paths for non-ASCII characters
//NOTE: Non-ASCII in one of those paths (don't know which) will make NodeJS crash due to a bug in v8 (or something)
//      when running localization methods like Date.toLocaleString().
//      There was also an issue with the slash() lib and with the +exec on FXServer
const nonASCIIRegex = /[^\x00-\x80]+/g;
const colorNonAscii = (x: string) => chalk.black.bgGreenBright(
    x.replaceAll(nonASCIIRegex, (m) => chalk.bgRedBright(m))
);
if (nonASCIIRegex.test(fxsPath) || nonASCIIRegex.test(dataPath)) {
    fatalError.GlobalData(7, [
        'Due to environmental restrictions, your paths CANNOT contain non-ASCII characters.',
        'Example of non-ASCII characters: çâýå, ρέθ, ñäé, ēļæ, глж, เซิร์, 警告.',
        'Please make sure FXServer is not in a path contaning those characters.',
        `If on windows, we suggest you moving the artifact to "C:/fivemserver/${fxsVersion}/".`,
        'FXServer path: ' + colorNonAscii(fxsPath),
        'txData path: ' + colorNonAscii(dataPath),
    ]);
}

//Profile - not available as env var
let profileVar = nativeVars.txAdminProfile;
if (profileVar) {
    profileVar = profileVar.replace(/[^a-z0-9._-]/gi, '');
    if (profileVar.endsWith('.base')) {
        fatalError.GlobalData(13, [
            ['Invalid server profile name', profileVar],
            'Profile names cannot end with ".base".',
            'It looks like you are trying to point to a server folder instead of a profile.',
        ]);
    }
    if (!profileVar.length) {
        fatalError.GlobalData(14, [
            'Invalid server profile name.',
            'If you are using Google Translator on the instructions page,',
            'make sure there are no additional spaces in your command.',
        ]);
    }
}
const profileName = profileVar ?? 'default';
const profilePath = cleanPath(path.join(dataPath, profileName));


/**
 * MARK: ZAP & NETWORKING
 */
let zapVars: ReturnType<typeof getZapVars> | undefined;
if (!ignoreDeprecatedConfigs) {
    //FIXME: ZAP doesn't need this anymore, remove ASAP
    const zapCfgFilePath = path.join(dataPath, 'txAdminZapConfig.json');
    try {
        zapVars = getZapVars(zapCfgFilePath);
        if (!_txDevEnv.ENABLED) fsp.unlink(zapCfgFilePath).catch(() => { });
    } catch (error) {
        fatalError.GlobalData(9, 'Failed to load with ZAP-Hosting configuration.', error);
    }
}

//No default, no convar/zap cfg
const txaUrl = hostVars.TXA_URL;

//txAdmin port
const txaPort = handleMultiVar(
    'TXA_PORT',
    hostEnvVarSchemas.TXA_PORT,
    hostVars.TXA_PORT,
    zapVars?.txAdminPort,
    nativeVars.txAdminPort,
) ?? 40120;

//fxserver port
const fxsPort = handleMultiVar(
    'FXS_PORT',
    hostEnvVarSchemas.FXS_PORT,
    hostVars.FXS_PORT,
    zapVars?.forceFXServerPort,
    undefined,
);

//Forced interface
const netInterface = handleMultiVar(
    'INTERFACE',
    hostEnvVarSchemas.INTERFACE,
    hostVars.INTERFACE,
    zapVars?.forceInterface,
    nativeVars.txAdminInterface,
);
if (netInterface) {
    addLocalIpAddress(netInterface);
}


/**
 * MARK: GENERAL
 */
const forceGameName = hostVars.GAME_NAME;
const hostApiToken = hostVars.API_TOKEN;

const forceMaxClients = handleMultiVar(
    'MAX_SLOTS',
    hostEnvVarSchemas.MAX_SLOTS,
    hostVars.MAX_SLOTS,
    zapVars?.deployerDefaults?.maxClients,
    undefined,
);

const forceQuietMode = handleMultiVar(
    'QUIET_MODE',
    hostEnvVarSchemas.QUIET_MODE,
    hostVars.QUIET_MODE,
    zapVars?.deployerDefaults?.maxClients,
    undefined,
) ?? false;


/**
 * MARK: PROVIDER
 */
const providerName = handleMultiVar(
    'PROVIDER_NAME',
    hostEnvVarSchemas.PROVIDER_NAME,
    hostVars.PROVIDER_NAME,
    zapVars?.providerName,
    undefined,
);
const providerLogo = handleMultiVar(
    'PROVIDER_LOGO',
    hostEnvVarSchemas.PROVIDER_LOGO,
    hostVars.PROVIDER_LOGO,
    zapVars?.loginPageLogo,
    undefined,
);


/**
 * MARK: DEFAULTS
 */
const defaultDbHost = handleMultiVar(
    'DEFAULT_DBHOST',
    hostEnvVarSchemas.DEFAULT_DBHOST,
    hostVars.DEFAULT_DBHOST,
    zapVars?.deployerDefaults?.mysqlHost,
    undefined,
);
const defaultDbPort = handleMultiVar(
    'DEFAULT_DBPORT',
    hostEnvVarSchemas.DEFAULT_DBPORT,
    hostVars.DEFAULT_DBPORT,
    zapVars?.deployerDefaults?.mysqlPort,
    undefined,
);
const defaultDbUser = handleMultiVar(
    'DEFAULT_DBUSER',
    hostEnvVarSchemas.DEFAULT_DBUSER,
    hostVars.DEFAULT_DBUSER,
    zapVars?.deployerDefaults?.mysqlUser,
    undefined,
);
const defaultDbPass = handleMultiVar(
    'DEFAULT_DBPASS',
    hostEnvVarSchemas.DEFAULT_DBPASS,
    hostVars.DEFAULT_DBPASS,
    zapVars?.deployerDefaults?.mysqlPassword,
    undefined,
);
const defaultDbName = handleMultiVar(
    'DEFAULT_DBNAME',
    hostEnvVarSchemas.DEFAULT_DBNAME,
    hostVars.DEFAULT_DBNAME,
    zapVars?.deployerDefaults?.mysqlDatabase,
    undefined,
);

//Default Master Account
type DefaultMasterAccount = {
    username: string;
    fivemId?: string;
    password?: string;
} | {
    username: string;
    password: string;
} | undefined;
let defaultMasterAccount: DefaultMasterAccount;
const bcryptRegex = /^\$2[aby]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/;
if (hostVars.DEFAULT_ACCOUNT) {
    let [username, fivemId, password] = hostVars.DEFAULT_ACCOUNT.split(':') as (string | undefined)[];
    if (username === '') username = undefined;
    if (fivemId === '') fivemId = undefined;
    if (password === '') password = undefined;

    const errArr: [string, any][] = [
        ['Username', username],
        ['FiveM ID', fivemId],
        ['Password', password],
    ];
    if (!username || !consts.regexValidFivemUsername.test(username)) {
        fatalError.GlobalData(21, [
            'Invalid default account username.',
            'It should be a valid FiveM username.',
            ...errArr,
        ]);
    }
    if (fivemId && !consts.validIdentifierParts.fivem.test(fivemId)) {
        fatalError.GlobalData(22, [
            'Invalid default account FiveM ID.',
            'It should match the number in the fivem:0000000 game identifier.',
            ...errArr,
        ]);
    }
    if (password && !bcryptRegex.test(password)) {
        fatalError.GlobalData(23, [
            'Invalid default account password.',
            'Expected bcrypt hash.',
            ...errArr,
        ]);
    }
    if (!fivemId && !password) {
        fatalError.GlobalData(24, [
            'Invalid default account.',
            'Expected at least the FiveM ID or password to be present.',
            ...errArr,
        ]);
    }
    defaultMasterAccount = {
        username,
        fivemId,
        password,
    };
} else if (zapVars?.defaultMasterAccount) {
    const username = zapVars.defaultMasterAccount?.name;
    const password = zapVars.defaultMasterAccount?.password_hash;
    if (!consts.regexValidFivemUsername.test(username)) {
        fatalError.GlobalData(25, [
            'Invalid default account username.',
            'It should be a valid FiveM username.',
            ['Username', username],
        ]);
    }
    if (!bcryptRegex.test(password)) {
        fatalError.GlobalData(26, [
            'Invalid default account password.',
            'Expected bcrypt hash.',
            ['Hash', password],
        ]);
    }
    defaultMasterAccount = {
        username: username,
        password: password,
    };
}

//Default cfx key
const defaultCfxKey = handleMultiVar(
    'DEFAULT_CFXKEY',
    hostEnvVarSchemas.DEFAULT_CFXKEY,
    hostVars.DEFAULT_CFXKEY,
    zapVars?.deployerDefaults?.license,
    undefined,
);


/**
 * MARK: FINAL SETUP
 */
if (ignoreDeprecatedConfigs) {
    console.verbose.debug('TXHOST_IGNORE_DEPRECATED_CONFIGS is set to true. Ignoring deprecated configs.');
}

const isPterodactyl = !isWindows && process.env?.TXADMIN_ENABLE === '1';
const isZapHosting = providerName === 'ZAP-Hosting';
const setConsoleTitle = !(isPterodactyl || isZapHosting || providerName); //assume not a terminal


//FXServer Display Version
let fxsVersionTag = fxsVersion.toString();
if (fxsVerParsed.branch && fxsVerParsed.branch !== 'master') {
    fxsVersionTag += '-ft';
}

let providerTag = '';
const partnerPrefixes = {
    'gportal': 'GPor',
    'nitrado': 'Nitr',
    'nodecraft': 'NoCr',
    'shockbyte': 'ShBy',
    'xrealm': 'XRea',
    'zaphosting': 'ZapH',
} as { [key: string]: string };
if (providerName) {
    const cleanName = providerName.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (cleanName in partnerPrefixes) {
        providerTag = partnerPrefixes[cleanName];
    }
}

if (providerTag) {
    fxsVersionTag += `/${providerTag}`;
} else if (isPterodactyl) {
    fxsVersionTag += '/Ptero';
} else if (isWindows && fxsVerParsed.platform === 'windows') {
    fxsVersionTag += '/Win';
} else if (!isWindows && fxsVerParsed.platform === 'linux') {
    fxsVersionTag += '/Lin';
} else {
    fxsVersionTag += '/Unk';
}


/**
 * MARK: Exports
 */
export const txDevEnv = Object.freeze(_txDevEnv);

export const txEnv = Object.freeze({
    //Calculated
    isWindows,
    setConsoleTitle,

    //TODO: remove, used only in diagnostics (HB Data + page)
    isPterodactyl,
    isZapHosting, //NOTE: This one is also used in authLogic to disable src check

    //Natives
    fxsVersionTag,
    fxsVersion,
    txaVersion,
    txaPath,
    fxsPath,

    //ConVar
    profileName,
    profilePath, //FIXME: replace by profileSubPath in most places
    profileSubPath: (...parts: string[]) => path.join(profilePath, ...parts),
});

export const txHostConfig = Object.freeze({
    //General
    dataPath,
    dataSubPath: (...parts: string[]) => path.join(dataPath, ...parts),
    hasCustomDataPath,
    forceGameName,
    forceMaxClients,
    forceQuietMode,
    hostApiToken,

    //Networking
    txaUrl,
    txaPort,
    fxsPort,
    netInterface,

    //Provider
    providerName,
    providerLogo,
    sourceName: providerName ?? 'Host Config',

    //Defaults
    defaults: {
        account: defaultMasterAccount,
        cfxKey: defaultCfxKey,
        dbHost: defaultDbHost,
        dbPort: defaultDbPort,
        dbUser: defaultDbUser,
        dbPass: defaultDbPass,
        dbName: defaultDbName,
    },
});


//DEBUG
// console.dir(txEnv, { compact: true });
// console.dir(txDevEnv, { compact: true });
// console.dir(txHostConfig, { compact: true });
