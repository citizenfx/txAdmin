const modulename = 'WebServer:MasterActions:GetBackup';
import fsp from 'node:fs/promises';
import consoleFactory from '@lib/console';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { getTimeFilename } from '@lib/misc';
import { txEnv } from '@core/globalData';
const console = consoleFactory(modulename);


/**
 * Handles the rendering or delivery of master action resources
 */
export default async function MasterActionsGet(ctx: AuthedCtx) {
    //Check permissions
    if (!ctx.admin.testPermission('master', modulename)) {
        return ctx.utils.renderMessage('Only the master account has permission to view/use this page.');
    }
    if (!ctx.txVars.isWebInterface) {
        return ctx.utils.renderMessage('This functionality cannot be used by the in-game menu, please use the web version of txAdmin.');
    }

    const dbPath = `${txEnv.profilePath}/data/playersDB.json`;
    let readFile;
    try {
        readFile = await fsp.readFile(dbPath);
    } catch (error) {
        console.error(`Could not read database file ${dbPath}.`);
        return ctx.utils.renderMessage(`Failed to generate backup file with error: ${(error as Error).message}`);
    }
    //getTimeFilename
    ctx.attachment(`playersDB_${getTimeFilename()}.json`);
    ctx.body = readFile;
    console.log(`[${ctx.admin.name}] Downloading player database.`);
};
