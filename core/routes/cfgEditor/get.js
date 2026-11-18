const modulename = 'WebServer:CFGEditorPage';
import { resolveCFGFilePath, readRawCFGFile } from '@lib/fxserver/fxsConfigHelper';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);


/**
 * Returns the output page containing the server.cfg
 * @param {import('@modules/WebServer/ctxTypes').AuthedCtx} ctx
 */
export default async function CFGEditorPage(ctx) {
    //Check permissions
    if (!ctx.admin.hasPermission('server.cfg.editor')) {
        return ctx.utils.renderMessage('You don\'t have permission to view this page.');
    }

    //Check if file is set
    if (!txCore.fxRunner.isConfigured) {
        let message = 'You need to configure your server data path before being able to edit the CFG file.';
        return ctx.utils.renderMessage(message);
    }

    //Read cfg file
    let rawFile;
    try {
        let cfgFilePath = resolveCFGFilePath(txConfig.server.cfgPath, txConfig.server.dataPath);
        rawFile = await readRawCFGFile(cfgFilePath);
    } catch (error) {
        let message = `Failed to read CFG File with error: ${error.message}`;
        return ctx.utils.renderMessage(message);
    }

    return ctx.utils.render('main/cfgEditor', {
        headerTitle: 'CFG Editor',
        rawFile,
        disableRestart: (ctx.admin.hasPermission('control.server')) ? '' : 'disabled',
    });
};
