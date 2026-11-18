const modulename = 'WebServer:DeployerStatus';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);


/**
 * Returns the output page containing the live console
 * @param {import('@modules/WebServer/ctxTypes').AuthedCtx} ctx
 */
export default async function DeployerStatus(ctx) {
    //Check permissions
    if (!ctx.admin.hasPermission('all_permissions')) {
        return ctx.send({success: false, refresh: true});
    }

    //Check if this is the correct state for the deployer
    if (txManager.deployer == null) {
        return ctx.send({success: false, refresh: true});
    }

    //Prepare data
    const outData = {
        progress: txManager.deployer.progress,
        log: txManager.deployer.getDeployerLog(),
    };
    if (txManager.deployer.step == 'configure') {
        outData.status = 'done';
    } else if (txManager.deployer.deployFailed) {
        outData.status = 'failed';
    } else {
        outData.status = 'running';
    }

    return ctx.send(outData);
};
