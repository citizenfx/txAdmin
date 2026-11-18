const modulename = 'WebServer:FXServerSchedule';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import consoleFactory from '@lib/console';
import { ApiToastResp } from '@shared/genericApiTypes';
const console = consoleFactory(modulename);


/**
 * Handle all the server scheduler commands
 */
export default async function FXServerSchedule(ctx: AuthedCtx) {
    if (
        typeof ctx.request.body.action === 'undefined'
        || typeof ctx.request.body.parameter === 'undefined'
    ) {
        return ctx.send<ApiToastResp>({
            type: 'error',
            msg: `invalid request`,
        });
    }
    const {action, parameter} = ctx.request.body;

    //Check permissions
    if (!ctx.admin.testPermission('control.server', modulename)) {
        return ctx.send<ApiToastResp>({
            type: 'error',
            msg: 'You don\'t have permission to execute this action.',
        });
    }

    if (action === 'setNextTempSchedule') {
        try {
            txCore.fxScheduler.setNextTempSchedule(parameter);
            ctx.admin.logAction(`Scheduling server restart at ${parameter}`);
            return ctx.send<ApiToastResp>({
                type: 'success',
                msg: 'Restart scheduled.',
            });
        } catch (error) {
            return ctx.send<ApiToastResp>({
                type: 'error',
                msg: (error as Error).message,
            });
        }

    } else if (action === 'setNextSkip') {
        try {
            txCore.fxScheduler.setNextSkip(parameter, ctx.admin.name);
            const logAct = parameter ? 'Cancelling' : 'Re-enabling';
            ctx.admin.logAction(`${logAct} next scheduled restart.`);
            return ctx.send<ApiToastResp>({
                type: 'success',
                msg: 'Schedule changed.',
            });
        } catch (error) {
            return ctx.send<ApiToastResp>({
                type: 'error',
                msg: (error as Error).message,
            });
        }

    } else {
        return ctx.send<ApiToastResp>({
            type: 'error',
            msg: 'Unknown Action.',
        });
    }
};
