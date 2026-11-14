const modulename = 'WebServer:SetupVarsMw';
import consoleFactory from '@lib/console';
import consts from '@shared/consts';
const console = consoleFactory(modulename);
import { Next } from "koa";
import { CtxWithSession } from '../ctxTypes';
import { isIpAddressLocal } from '@lib/host/isIpAddressLocal';

//The custom tx-related vars set to the ctx
export type CtxTxVars = {
    isWebInterface: boolean;
    realIP: string;
    isLocalRequest: boolean;
    hostType: 'localhost' | 'ip' | 'other';
};


/**
 * Middleware responsible for setting up the ctx.txVars
 */
const ctxVarsMw = (ctx: CtxWithSession, next: Next) => {
    //Prepare variables
    const txVars: CtxTxVars = {
        isWebInterface: typeof ctx.headers['x-txadmin-token'] !== 'string',
        realIP: ctx.ip,
        isLocalRequest: isIpAddressLocal(ctx.ip),
        hostType: 'other',
    };

    //Setting up the user's host type
    const host = ctx.request.host ?? 'none';
    if (host.startsWith('localhost') || host.startsWith('127.') || host.startsWith('[::1]')) {
        txVars.hostType = 'localhost';
    } else if (/^\d+\.\d+\.\d+\.\d+(?::\d+)?$/.test(host) || /^\[[\da-fA-F:]+\](?::\d+)?$/.test(host)) {
        txVars.hostType = 'ip';
    }

    //Setting up the user's real ip from the webpipe
    //NOTE: not used anywhere except rate limiter, and login logs.
    if (
        typeof ctx.headers['x-txadmin-identifiers'] === 'string'
        && typeof ctx.headers['x-txadmin-token'] === 'string'
        && ctx.headers['x-txadmin-token'] === txCore.webServer.luaComToken
        && txVars.isLocalRequest
    ) {
        const ipIdentifier = ctx.headers['x-txadmin-identifiers']
            .split(',')
            .find((i) => i.substring(0, 3) === 'ip:');
        if (ipIdentifier) {
            const srcIP = ipIdentifier.substring(3);
            if (consts.regexValidIP.test(srcIP)) {
                txVars.realIP = srcIP;
            }
        }
    }

    //Injecting vars and continuing
    ctx.txVars = txVars;
    return next();
}

export default ctxVarsMw;
