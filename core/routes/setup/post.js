const modulename = 'WebServer:SetupPost';
import path from 'node:path';
import fse from 'fs-extra';
import fsp from 'node:fs/promises';
import slash from 'slash';
import { Deployer } from '@core/deployer/index';
import { validateFixServerConfig, findLikelyCFGPath } from '@lib/fxserver/fxsConfigHelper';
import got from '@lib/got';
import consoleFactory from '@lib/console';
import recipeParser from '@core/deployer/recipeParser';
import { validateTargetPath } from '@core/deployer/utils';
import { TxConfigState } from '@shared/enums';
const console = consoleFactory(modulename);

//Helper functions
const isUndefined = (x) => (x === undefined);

const getDirectories = (source) => {
    return fse.readdirSync(source, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
};

const getPotentialServerDataFolders = (source) => {
    try {
        return getDirectories(source)
            .filter((dirent) => getDirectories(path.join(source, dirent)).includes('resources'))
            .map((dirent) => slash(path.join(source, dirent)) + '/');
    } catch (error) {
        console.verbose.warn(`Failed to find server data folder with message: ${error.message}`);
        return [];
    }
};

/*
    NOTE: How forgiving are we:
        - Ignore trailing slashes, as well as fix backslashes
        - Check if its the parent folder
        - Check if its inside the parent folder
        - Check if its inside current folder
        - Check if it contains the string `/resources`, then if its the path up to that string
        - Detect config as `server.cfg` or with wrong extensions inside the Server Data Folder

    FIXME: Also note that this entire file is a bit too messy, please clean it up a bit
*/

/**
 * Handle all the server control actions
 * FIXME: separate into validate.ts, saveDeployer.ts, and saveLocal.ts files
 * FIXME: or maybe postDeployer.ts, and postLocal.ts files
 * @param {import('@modules/WebServer/ctxTypes').AuthedCtx} ctx
 */
export default async function SetupPost(ctx) {
    //Sanity check
    if (isUndefined(ctx.params.action)) {
        return ctx.utils.error(400, 'Invalid Request');
    }
    const action = ctx.params.action;

    //Check permissions
    if (!ctx.admin.testPermission('all_permissions', modulename)) {
        return ctx.send({
            success: false,
            message: 'You need to be the admin master or have all permissions to use the setup page.',
        });
    }

    //Ensure the correct state for the setup page
    if (txManager.configState !== TxConfigState.Setup) {
        return ctx.send({
            success: false,
            refresh: true,
        });
    }

    //Delegate to the specific action functions
    if (action == 'validateRecipeURL') {
        return await handleValidateRecipeURL(ctx);
    } else if (action == 'validateLocalDeployPath') {
        return await handleValidateLocalDeployPath(ctx);
    } else if (action == 'validateLocalDataFolder') {
        return await handleValidateLocalDataFolder(ctx);
    } else if (action == 'validateCFGFile') {
        return await handleValidateCFGFile(ctx);
    } else if (action == 'save' && ctx.request.body.type == 'popular') {
        return await handleSaveDeployerImport(ctx);
    } else if (action == 'save' && ctx.request.body.type == 'remote') {
        return await handleSaveDeployerImport(ctx);
    } else if (action == 'save' && ctx.request.body.type == 'custom') {
        return await handleSaveDeployerCustom(ctx);
    } else if (action == 'save' && ctx.request.body.type == 'local') {
        return await handleSaveLocal(ctx);
    } else {
        return ctx.send({
            success: false,
            message: 'Unknown setup action.',
        });
    }
};


/**
 * Handle Validation of a remote recipe/template URL
 * @param {import('@modules/WebServer/ctxTypes').AuthedCtx} ctx
 */
async function handleValidateRecipeURL(ctx) {
    //Sanity check
    if (isUndefined(ctx.request.body.recipeURL)) {
        return ctx.utils.error(400, 'Invalid Request - missing parameters');
    }
    const recipeURL = ctx.request.body.recipeURL.trim();

    //Make request & validate recipe
    try {
        const recipeText = await got.get({
            url: recipeURL,
            timeout: { request: 4500 }
        }).text();
        if (typeof recipeText !== 'string') throw new Error('This URL did not return a string.');
        const recipe = recipeParser(recipeText);
        return ctx.send({success: true, name: recipe.name});
    } catch (error) {
        return ctx.send({success: false, message: `Recipe error: ${error.message}`});
    }
}


/**
 * Handle Validation of a remote recipe/template URL
 * @param {import('@modules/WebServer/ctxTypes').AuthedCtx} ctx
 */
async function handleValidateLocalDeployPath(ctx) {
    //Sanity check
    if (isUndefined(ctx.request.body.deployPath)) {
        return ctx.utils.error(400, 'Invalid Request - missing parameters');
    }
    const deployPath = slash(path.normalize(ctx.request.body.deployPath.trim()));

    //Perform path checking
    try {
        await validateTargetPath(deployPath); // will throw if invalid
        return ctx.send({success: true, message: 'Path is valid.'});
    } catch (error) {
        return ctx.send({success: false, message: error.message});
    }
}


/**
 * Handle Validation of Local (existing) Server Data Folder
 * @param {import('@modules/WebServer/ctxTypes').AuthedCtx} ctx
 */
async function handleValidateLocalDataFolder(ctx) {
    //Sanity check
    if (isUndefined(ctx.request.body.dataFolder)) {
        return ctx.utils.error(400, 'Invalid Request - missing parameters');
    }
    const dataFolderPath = slash(path.normalize(ctx.request.body.dataFolder.trim() + '/'));

    //FIXME: replace with stuff in core/routes/settings/saveConfigs.ts > handleFxserverCard
    try {
        if (!fse.existsSync(path.join(dataFolderPath, 'resources'))) {
            //Recovery if parent folder
            const attemptIsParent = path.join(dataFolderPath, '..');
            if (fse.existsSync(path.join(attemptIsParent, 'resources'))) {
                return ctx.send({success: false, suggestion: attemptIsParent});
            }

            //Recovery parent inside folder
            const attemptOutside = getPotentialServerDataFolders(path.join(dataFolderPath, '..'));
            if (attemptOutside.length >= 1) {
                return ctx.send({success: false, suggestion: attemptOutside[0]});
            }

            //Recovery if resources
            if (dataFolderPath.includes('/resources')) {
                const attemptRes = dataFolderPath.split('/resources')[0];
                if (fse.existsSync(path.join(attemptRes, 'resources'))) {
                    return ctx.send({success: false, suggestion: attemptRes});
                }
            }

            //Recovery subfolder
            const attemptInside = getPotentialServerDataFolders(dataFolderPath);
            if (attemptInside.length >= 1) {
                return ctx.send({success: false, suggestion: attemptInside[0]});
            }

            //really invalid :(
            throw new Error("Couldn't locate or read a resources folder inside of the path provided.");
        } else {
            return ctx.send({
                success: true,
                detectedConfig: findLikelyCFGPath(dataFolderPath),
            });
        }
    } catch (error) {
        return ctx.send({success: false, message: error.message});
    }
}


/**
 * Handle Validation of CFG File
 * @param {import('@modules/WebServer/ctxTypes').AuthedCtx} ctx
 */
async function handleValidateCFGFile(ctx) {
    //Sanity check
    if (
        isUndefined(ctx.request.body.dataFolder)
        || isUndefined(ctx.request.body.cfgFile)
    ) {
        return ctx.utils.error(400, 'Invalid Request - missing parameters');
    }

    const dataFolderPath = slash(path.normalize(ctx.request.body.dataFolder.trim()));
    const cfgFilePathNormalized = slash(path.normalize(ctx.request.body.cfgFile.trim()));

    //Validate file
    try {
        const result = await validateFixServerConfig(cfgFilePathNormalized, dataFolderPath);
        if (result.errors) {
            const message = `**The file path is correct, but there are error(s) in your config file(s):**\n${result.errors}`;
            return ctx.send({success: false, markdown: true, message});
        } else {
            return ctx.send({success: true});
        }
    } catch (error) {
        const message = `Error:\n ${error.message}.`;
        return ctx.send({success: false, message});
    }
}


/**
 * Handle Save settings for local server data imports
 * Actions: sets serverDataPath/cfgPath, starts the server, redirect to live console
 * @param {import('@modules/WebServer/ctxTypes').AuthedCtx} ctx
 */
async function handleSaveLocal(ctx) {
    //Sanity check
    if (
        isUndefined(ctx.request.body.name)
        || isUndefined(ctx.request.body.dataFolder)
        || isUndefined(ctx.request.body.cfgFile)
    ) {
        return ctx.utils.error(400, 'Invalid Request - missing parameters');
    }

    //Prepare body input
    const cfg = {
        name: ctx.request.body.name.trim(),
        dataFolder: slash(path.normalize(ctx.request.body.dataFolder + '/')),
        cfgFile: slash(path.normalize(ctx.request.body.cfgFile)),
    };

    //Validating Server Data Path
    try {
        const stat = await fsp.stat(path.join(cfg.dataFolder, 'resources'))
        if (!stat.isDirectory()) {
            throw new Error('not a directory');
        }
    } catch (error) {
        let msg = error?.message ?? 'unknown error';
        if (error?.code === 'ENOENT') {
            msg = 'The server data folder does not exist.';
        }
        return ctx.send({success: false, message: `<strong>Server Data Folder error:</strong> ${msg}`});
    }

    //Preparing & saving config
    try {
        txCore.configStore.saveConfigs({
            general: {
                serverName: cfg.name,
            },
            server: {
                dataPath: cfg.dataFolder,
                cfgPath: cfg.cfgFile,
            }
        }, ctx.admin.name);
    } catch (error) {
        console.warn(`[${ctx.admin.name}] Error changing global/fxserver settings via setup stepper.`);
        console.verbose.dir(error);
        return ctx.send({
            type: 'danger',
            markdown: true,
            message: `**Error saving the configuration file:**\n${error.message}`
        });
    }

    //Refreshing config
    txCore.cacheStore.set('deployer:recipe', 'none');

    //Logging
    ctx.admin.logAction('Changing global/fxserver settings via setup stepper.');

    //If running (for some reason), kill it first 
    if (!txCore.fxRunner.isIdle) {
        ctx.admin.logCommand('STOP SERVER');
        await txCore.fxRunner.killServer('new server set up', ctx.admin.name, true);
    }

    //Starting server
    const spawnError = await txCore.fxRunner.spawnServer(false);
    if (spawnError !== null) {
        return ctx.send({success: false, markdown: true, message: spawnError});
    } else {
        return ctx.send({success: true});
    }
}


/**
 * Handle Save settings for remote recipe importing
 * Actions: download recipe, starts deployer
 * @param {import('@modules/WebServer/ctxTypes').AuthedCtx} ctx
 */
async function handleSaveDeployerImport(ctx) {
    //Sanity check
    if (
        isUndefined(ctx.request.body.name)
        || isUndefined(ctx.request.body.isTrustedSource)
        || isUndefined(ctx.request.body.recipeURL)
        || isUndefined(ctx.request.body.targetPath)
        || isUndefined(ctx.request.body.deploymentID)
    ) {
        return ctx.utils.error(400, 'Invalid Request - missing parameters');
    }
    const isTrustedSource = (ctx.request.body.isTrustedSource === 'true');
    const serverName = ctx.request.body.name.trim();
    const recipeURL = ctx.request.body.recipeURL.trim();
    const targetPath = slash(path.normalize(ctx.request.body.targetPath + '/'));
    const deploymentID = ctx.request.body.deploymentID;

    //Get recipe
    let recipeText;
    try {
        recipeText = await got.get({
            url: recipeURL,
            timeout: { request: 4500 }
        }).text();
        if (typeof recipeText !== 'string') throw new Error('This URL did not return a string.');
    } catch (error) {
        return ctx.send({success: false, message: `Recipe download error: ${error.message}`});
    }

    //Preparing & saving config
    try {
        txCore.configStore.saveConfigs({
            general: { serverName },
        }, ctx.admin.name);
    } catch (error) {
        console.warn(`[${ctx.admin.name}] Error changing global settings via setup stepper.`);
        console.verbose.dir(error);
        return ctx.send({
            type: 'danger',
            markdown: true,
            message: `**Error saving the configuration file:** ${error.message}`
        });
    }
    ctx.admin.logAction('Changing global settings via setup stepper and started Deployer.');

    //Start deployer (constructor will validate the recipe)
    try {
        txManager.startDeployer(recipeText, deploymentID, targetPath, isTrustedSource, {serverName});
        txCore.webServer.webSocket.pushRefresh('status');
    } catch (error) {
        return ctx.send({success: false, message: error.message});
    }
    return ctx.send({success: true});
}


/**
 * Handle Save settings for custom recipe
 * Actions: download recipe, starts deployer
 * @param {import('@modules/WebServer/ctxTypes').AuthedCtx} ctx
 */
async function handleSaveDeployerCustom(ctx) {
    //Sanity check
    if (
        isUndefined(ctx.request.body.name)
        || isUndefined(ctx.request.body.targetPath)
        || isUndefined(ctx.request.body.deploymentID)
    ) {
        return ctx.utils.error(400, 'Invalid Request - missing parameters');
    }
    const serverName = ctx.request.body.name.trim();
    const targetPath = slash(path.normalize(ctx.request.body.targetPath + '/'));
    const deploymentID = ctx.request.body.deploymentID;

    //Preparing & saving config
    try {
        txCore.configStore.saveConfigs({
            general: { serverName },
        }, ctx.admin.name);
    } catch (error) {
        console.warn(`[${ctx.admin.name}] Error changing global settings via setup stepper.`);
        console.verbose.dir(error);
        return ctx.send({
            type: 'danger',
            markdown: true,
            message: `**Error saving the configuration file:** ${error.message}`
        });
    }
    ctx.admin.logAction('Changing global settings via setup stepper and started Deployer.');

    //Start deployer (constructor will create the recipe template)
    const customMetaData = {
        author: ctx.admin.name,
        serverName,
    };
    try {
        txManager.startDeployer(false, deploymentID, targetPath, false, customMetaData);
        txCore.webServer.webSocket.pushRefresh('status');
    } catch (error) {
        return ctx.send({success: false, message: error.message});
    }
    return ctx.send({success: true});
}
