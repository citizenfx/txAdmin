import { SYM_SYSTEM_AUTHOR } from "@lib/symbols";
import type { AdvancedCommandHandler } from "../runCommand";
import { mdCodeBlock, parseFiniteIntString } from "@lib/misc";


const forceUpdateMutableConvars: AdvancedCommandHandler = async (ctx, args) => {
    const convarList = await txCore.fxRunner.updateMutableConvars();
    if (!convarList) {
        return {
            type: 'md',
            data: `Failed to update mutable convars.\nCheck the terminal for more details.`,
        }
    }
    const lines = convarList.map(([set, convar, value]) => `${set} ${convar} ${value}`);
    return {
        type: 'md',
        data: [
            '## Convars Updated:',
            mdCodeBlock(lines.join('\n'), 'txt'),
        ].join('\n'),
    }
}


const safelyRestartMonitorResource: AdvancedCommandHandler = (ctx, args) => {
    const setCmdResult = txCore.fxRunner.sendCommand(
        'set',
        [
            'txAdmin-luaComToken',
            txCore.webServer.luaComToken,
        ],
        SYM_SYSTEM_AUTHOR
    );
    if (!setCmdResult) {
        return {
            type: 'md',
            data: 'Failed to reset luaComToken.\nCheck the terminal for more details.',
        }
    }
    const ensureCmdResult = txCore.fxRunner.sendCommand(
        'ensure',
        ['monitor'],
        SYM_SYSTEM_AUTHOR
    );
    if (ensureCmdResult) {
        return {
            type: 'md',
            data: 'Monitor restarted.',
        }
    } else {
        return {
            type: 'md',
            data: 'Failed to restart monitor.\nCheck the terminal for more details.',
        }
    }
}


const forceReauthRecentPlayers: AdvancedCommandHandler = async (ctx, args) => {
    const numPlayers = parseFiniteIntString(args) ?? 10;
    if (numPlayers < 1) {
        return {
            type: 'md',
            data: `Invalid argument: ${args}`,
        }
    }
    const netIds = txCore.fxPlayerlist.getPlayerList().map((p) => p.netid).slice(-numPlayers);
    txCore.fxRunner.sendEvent('adminsUpdated', netIds);
    return {
        type: 'md',
        data: `Refreshed players with NetIDs: ${netIds.join(', ')}`,
    }
}


export default {
    forceUpdateMutableConvars,
    safelyRestartMonitorResource,
    forceReauthRecentPlayers,
}
