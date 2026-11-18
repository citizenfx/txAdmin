const modulename = 'WebServer:SetupGet';
import path from 'node:path';
import { txEnv, txHostConfig } from '@core/globalData';
import { RECIPE_DEPLOYER_VERSION } from '@core/deployer/index';
import consoleFactory from '@lib/console';
import { TxConfigState } from '@shared/enums';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
const console = consoleFactory(modulename);


/**
 * Returns the output page containing the live console
 */
export default async function SetupGet(ctx: AuthedCtx) {
    //Check permissions
    if (!ctx.admin.hasPermission('master')) {
        return ctx.utils.renderMessage('You need to be the admin master to use the setup page.');
    }

    // Ensure correct state for the setup page
    if(txManager.configState === TxConfigState.Deployer) {
        return ctx.utils.legacyNavigateToPage('/server/deployer');
    } else if(txManager.configState !== TxConfigState.Setup) {
        return ctx.utils.legacyNavigateToPage('/');
    }

    //Output
    const storedConfig = txCore.configStore.getStoredConfig();
    const renderData = {
        headerTitle: 'Setup',
        skipServerName: !!(storedConfig.general?.serverName),
        deployerEngineVersion: RECIPE_DEPLOYER_VERSION,
        forceGameName: txHostConfig.forceGameName ?? '', //ejs injection works better with strings
        dataPath: txHostConfig.dataPath,
        hasCustomDataPath: txHostConfig.hasCustomDataPath,
    };
    return ctx.utils.render('standalone/setup', renderData);
};
