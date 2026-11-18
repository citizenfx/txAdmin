import { mdCodeBlock, msToShortishDuration } from "@lib/misc";
import type { AdvancedCommandHandler } from "../runCommand";


const setVerbosity: AdvancedCommandHandler = (ctx, args) => {
    if (args === 'true') {
        console.setVerbose(true);
    } else if (args === 'false') {
        console.setVerbose(false);
    } else if (!args) {
        return {
            type: 'md',
            data: `The current verbosity is ${console.isVerbose}.\nYou need to pass a boolean value to set it.`,
        }
    } else {
        return {
            type: 'md',
            data: `Invalid argument: ${args}`,
        }
    }

    return {
        type: 'md',
        data: `Console verbosity set to ${console.isVerbose}`,
    }
}


const setConfig: AdvancedCommandHandler = (ctx, args) => {
    const [scopeKey, valueString] = args.split(/\s+/, 2);
    if (!scopeKey || !valueString) throw new Error(`Invalid set command: ${args}`);
    const [scope, key] = scopeKey.split('.');
    if (!scope || !key) throw new Error(`Invalid scope.key: ${scopeKey}`);

    const configUpdate: any = {};
    try {
        configUpdate[scope] = { [key]: JSON.parse(valueString) };
    } catch (error) {
        console.dir(error);
        return {
            type: 'md',
            data: `Failed to parse the JSON value: ${valueString}\nIf you are trying to set a string, you must wrap it in quotes.`,
        }
    }
    const { raw: keysUpdated } = txCore.configStore.saveConfigs(configUpdate, ctx.admin.name);
    const outParts = [
        '## Keys Updated:',
        mdCodeBlock(JSON.stringify(keysUpdated ?? 'not set', null, 2), 'json'),
        '## Stored:',
        mdCodeBlock(JSON.stringify(txCore.configStore.getStoredConfig(), null, 2), 'json'),
    ];

    return {
        type: 'md',
        data: outParts.join('\n'),
    }
}


const printFullPlayerList: AdvancedCommandHandler = (ctx, args) => {
    return {
        type: 'json',
        data: JSON.stringify(txCore.fxPlayerlist.getPlayerList(), null, 2),
    }
}


const printFullServerLogBuffer: AdvancedCommandHandler = (ctx, args) => {
    return {
        type: 'json',
        data: JSON.stringify(txCore.logger.server.getRecentBuffer(), null, 2),
    }
}


const printFxRunnerChildHistory: AdvancedCommandHandler = (ctx, args) => {
    return {
        type: 'json',
        data: JSON.stringify(txCore.fxRunner.history, null, 2),
    }
}


const printLoggerErrors: AdvancedCommandHandler = (ctx, args) => {
    const outData = {
        admin: txCore.logger.admin.lrLastError,
        fxserver: txCore.logger.fxserver.lrLastError,
        server: txCore.logger.server.lrLastError,
    };
    return {
        type: 'json',
        data: JSON.stringify(outData, null, 2),
    }
}


const printFxResourcesBootLog: AdvancedCommandHandler = (ctx, args) => {
    const bootLog = txCore.fxResources.latestBootLog;
    if (!bootLog) {
        return {
            type: 'md',
            data: 'Server has not booted yet.',
        }
    } else {
        const maxResNameLength = Math.max(...bootLog.map((x) => x.resource.length));
        const lines = bootLog
            .sort((a, b) => b.duration - a.duration)
            .map((x) => {
                const name = x.resource.padEnd(maxResNameLength);
                const duration = msToShortishDuration(x.duration, { units: ['m', 's', 'ms'] });
                return `${name} ${duration}`;
            });
        return {
            type: 'md',
            data: [
                '## Latest Boot Log:',
                mdCodeBlock(lines.join('\n'), 'txt'),
            ].join('\n'),
        }
    }
}


export default {
    verbose: setVerbosity,
    set: setConfig,
    printFullPlayerList,
    printFullServerLogBuffer,
    printFxRunnerChildHistory,
    printLoggerErrors,
    printFxResourcesBootLog,
}
