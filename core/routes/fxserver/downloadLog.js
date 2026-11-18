const modulename = 'WebServer:FXServerDownloadLog';
import fs from 'node:fs';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);


/**
 * Returns the console log file
 * @param {import('@modules/WebServer/ctxTypes').AuthedCtx} ctx
 */
export default async function FXServerDownloadLog(ctx) {
    //Check permissions
    if (!ctx.admin.testPermission('console.view', modulename)) {
        return ctx.utils.renderMessage('You don\'t have permission to download this log.');
    }

    let readFile;
    try {
        //NOTE: why the fuck are errors from `createReadStream` not being caught? Well, using readFileSync for now...
        // readFile = fs.createReadStream(txCore.logger.fxserver.activeFilePath);
        readFile = fs.readFileSync(txCore.logger.fxserver.activeFilePath);
    } catch (error) {
        console.error(`Could not read log file ${txCore.logger.fxserver.activeFilePath}.`);
    }
    const now = (new Date() / 1000).toFixed();
    ctx.attachment(`fxserver_${now}.log`);
    ctx.body = readFile;
    console.log(`[${ctx.admin.name}] Downloading console log file.`);
};
