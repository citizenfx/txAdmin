const modulename = 'WebServer:DeployerStepper';
import fse from 'fs-extra';
import { txHostConfig } from '@core/globalData';
import consoleFactory from '@lib/console';
import { TxConfigState } from '@shared/enums';
import { sanitizeSimpleHtml } from '@lib/htmlRenderSafety';
const console = consoleFactory(modulename);


/**
 * Returns the output page containing the deployer stepper page (all 3 stages)
 * @param {import('@modules/WebServer/ctxTypes').AuthedCtx} ctx
 */
export default async function DeployerStepper(ctx) {
    //Check permissions
    if (!ctx.admin.hasPermission('master')) {
        return ctx.utils.renderMessage('You need to be the admin master to use the deployer.');
    }

    //Ensure the correct state for the deployer
    if(txManager.configState === TxConfigState.Setup) {
        return ctx.utils.legacyNavigateToPage('/server/setup');
    } else if(txManager.configState !== TxConfigState.Deployer) {
        return ctx.utils.legacyNavigateToPage('/');
    } else if(!txManager.deployer?.step){
        throw new Error(`txManager.configState is Deployer but txManager.deployer is not defined`);
    }

    //Prepare Output
    const renderData = {
        step: txManager.deployer.step,
        deploymentID: txManager.deployer.deploymentID,
        requireDBConfig: false,
        defaultLicenseKey: '',
        recipe: undefined,
        defaults: {},
    };

    if (txManager.deployer.step === 'review') {
        renderData.recipe = {
            isTrustedSource: txManager.deployer.isTrustedSource,
            name: txManager.deployer.recipe.name,
            author: txManager.deployer.recipe.author,
            description: txManager.deployer.recipe.description,
            raw: txManager.deployer.recipe.raw,
        };
    } else if (txManager.deployer.step === 'input') {
        renderData.defaultLicenseKey = txHostConfig.defaults.cfxKey ?? '';
        renderData.requireDBConfig = txManager.deployer.recipe.requireDBConfig;
        renderData.defaults = {
            autofilled: Object.values(txHostConfig.defaults).some(Boolean),
            license: txHostConfig.defaults.cfxKey ?? '',
            mysqlHost: txHostConfig.defaults.dbHost ?? 'localhost',
            mysqlPort: txHostConfig.defaults.dbPort ?? '3306',
            mysqlUser: txHostConfig.defaults.dbUser ?? 'root',
            mysqlPassword: txHostConfig.defaults.dbPass ?? '',
            mysqlDatabase: txHostConfig.defaults.dbName ?? txManager.deployer.deploymentID,
        };

        const knownVarDescriptions = {
            steam_webApiKey: 'The Steam Web API Key is used to authenticate players when they join.<br/>\nYou can get one at https://steamcommunity.com/dev/apikey.',
        }
        const recipeVars = txManager.deployer.getRecipeVars();
        renderData.inputVars = Object.keys(recipeVars).map((name) => {
            return {
                name: name,
                value: recipeVars[name],
                description: sanitizeSimpleHtml(knownVarDescriptions[name] || ''),
            };
        });
    } else if (txManager.deployer.step === 'run') {
        renderData.deployPath = txManager.deployer.deployPath;
    } else if (txManager.deployer.step === 'configure') {
        const errorMessage = `# server.cfg Not Found!
# This probably means you deleted it before pressing "Next".
# Press cancel and start the deployer again,
# or insert here the server.cfg contents.
# (╯°□°）╯︵ ┻━┻`;
        try {
            renderData.serverCFG = await fse.readFile(`${txManager.deployer.deployPath}/server.cfg`, 'utf8');
            if (renderData.serverCFG == '#save_attempt_please_ignore' || !renderData.serverCFG.length) {
                renderData.serverCFG = errorMessage;
            } else if (renderData.serverCFG.length > 10240) { //10kb
                renderData.serverCFG = `# This recipe created a ./server.cfg above 10kb, meaning its probably the wrong data. 
Make sure everything is correct in the recipe and try again.`;
            }
        } catch (error) {
            console.verbose.dir(error);
            renderData.serverCFG = errorMessage;
        }
    } else {
        return ctx.utils.renderMessage('Unknown Deployer step, please report this bug and restart txAdmin.');
    }

    return ctx.utils.render('standalone/deployer', renderData);
};
