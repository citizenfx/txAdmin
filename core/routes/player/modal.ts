const modulename = 'WebServer:PlayerModal';
import dateFormat from 'dateformat';
import playerResolver from '@lib/player/playerResolver';
import { PlayerHistoryItem, PlayerModalResp, PlayerModalPlayerData } from '@shared/playerApiTypes';
import { DatabaseActionType } from '@modules/Database/databaseTypes';
import { ServerPlayer } from '@lib/player/playerClasses';
import consoleFactory from '@lib/console';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { now } from '@lib/misc';
import { SYM_CURRENT_MUTEX } from '@lib/symbols';
const console = consoleFactory(modulename);

//Helpers
const processHistoryLog = (hist: DatabaseActionType[]) => {
    try {
        return hist.map((log): PlayerHistoryItem => {
            return {
                id: log.id,
                type: log.type,
                reason: log.reason,
                author: log.author,
                ts: log.timestamp,
                exp: log.expiration ? log.expiration : undefined,
                revokedBy: log.revocation.author ? log.revocation.author : undefined,
                revokedAt: log.revocation.timestamp ? log.revocation.timestamp : undefined,
            };
        });
    } catch (error) {
        console.error(`Error processing player history: ${(error as Error).message}`);
        return [];
    }
};


/**
 * Returns the data for the player's modal
 * NOTE: sending license instead of id to be able to show data even for offline players
 */
export default async function PlayerModal(ctx: AuthedCtx) {
    //Sanity check
    if (typeof ctx.query === 'undefined') {
        return ctx.utils.error(400, 'Invalid Request');
    }
    const { mutex, netid, license } = ctx.query;
    const sendTypedResp = (data: PlayerModalResp) => ctx.send(data);

    //Finding the player
    let player;
    try {
        const refMutex = mutex === 'current' ? SYM_CURRENT_MUTEX : mutex;
        player = playerResolver(refMutex, parseInt((netid as string)), license);
    } catch (error) {
        return sendTypedResp({ error: (error as Error).message });
    }

    //Prepping player data
    const playerData: PlayerModalPlayerData = {
        displayName: player.displayName,
        pureName: player.pureName,
        isRegistered: player.isRegistered,
        isConnected: player.isConnected,
        license: player.license,
        idsOnline: player.idsOnline,
        idsOffline: player.idsOffline,
        hwidsOnline: player.hwidsOnline,
        hwidsOffline: player.hwidsOffline,
        actionHistory: processHistoryLog(player.getHistory()),
    }

    if (player instanceof ServerPlayer) {
        playerData.netid = player.netid;
        playerData.sessionTime = Math.ceil((now() - player.tsConnected) / 60);
    }

    const playerDbData = player.getDbData();
    if (playerDbData) {
        playerData.tsJoined = playerDbData.tsJoined;
        playerData.playTime = playerDbData.playTime;
        playerData.tsWhitelisted = playerDbData.tsWhitelisted ? playerDbData.tsWhitelisted : undefined;
        playerData.tsLastConnection = playerDbData.tsLastConnection;

        if (playerDbData.notes?.lastAdmin && playerDbData.notes?.tsLastEdit) {
            playerData.notes = playerDbData.notes.text;
            const lastEditObj = new Date(playerDbData.notes.tsLastEdit * 1000);
            const lastEditString = dateFormat(lastEditObj, 'longDate');
            playerData.notesLog = `Last modified by ${playerDbData.notes.lastAdmin} at ${lastEditString}`;
        }
    }

    // console.dir(metaFields);
    // console.dir(playerData);
    return sendTypedResp({
        serverTime: now(),
        banTemplates: txConfig.banlist.templates, //TODO: move this to websocket push
        player: playerData
    });
};
