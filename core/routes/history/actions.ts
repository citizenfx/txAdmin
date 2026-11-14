const modulename = 'WebServer:HistoryActions';
import { GenericApiOkResp } from '@shared/genericApiTypes';
import { DatabaseActionType } from '@modules/Database/databaseTypes';
import { calcExpirationFromDuration } from '@lib/misc';
import consts from '@shared/consts';
import humanizeDuration, { Unit } from 'humanize-duration';
import consoleFactory from '@lib/console';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import { z } from 'zod';
const console = consoleFactory(modulename);

//Schema
const addLegacyBanBodySchema = z.object({
    identifiers: z.string().array(),
    reason: z.string().trim().min(3).max(2048),
    duration: z.string(),
});
export type ApiAddLegacyBanReqSchema = z.infer<typeof addLegacyBanBodySchema>;

const revokeActionBodySchema = z.object({
    actionId: z.string(),
});
export type ApiRevokeActionReqSchema = z.infer<typeof revokeActionBodySchema>;


/**
 * Endpoint to interact with the actions database.
 */
export default async function HistoryActions(ctx: AuthedCtx & { params: any }) {
    //Sanity check
    if (!ctx.params.action) {
        return ctx.utils.error(400, 'Invalid Request');
    }
    const action = ctx.params.action;
    const sendTypedResp = (data: GenericApiOkResp) => ctx.send(data);

    //Delegate to the specific action handler
    if (action === 'addLegacyBan') {
        return sendTypedResp(await handleBandIds(ctx));
    } else if (action === 'revokeAction') {
        return sendTypedResp(await handleRevokeAction(ctx));
    } else {
        return sendTypedResp({ error: 'unknown action' });
    }
};


/**
 * Handle Ban Player IDs (legacy ban!)
 * This is only called from the players page, where you ban an ID array instead of a PlayerClass
 * Doesn't support HWIDs, only banning player does
 */
async function handleBandIds(ctx: AuthedCtx): Promise<GenericApiOkResp> {
    //Checking request
    const schemaRes = addLegacyBanBodySchema.safeParse(ctx.request.body);
    if (!schemaRes.success) {
        return { error: 'Invalid request body.' };
    }
    const {
        reason,
        identifiers: identifiersInput,
        duration: durationInput
    } = schemaRes.data;

    //Filtering identifiers
    if (!identifiersInput.length) {
        return { error: 'You must send at least one identifier' };
    }
    const invalids = identifiersInput.filter((id) => {
        return (typeof id !== 'string') || !Object.values(consts.validIdentifiers).some((vf) => vf.test(id));
    });
    if (invalids.length) {
        return { error: 'Invalid IDs: ' + invalids.join(', ') };
    }
    const identifiers = [...new Set(identifiersInput)];


    //Calculating expiration/duration
    let calcResults;
    try {
        calcResults = calcExpirationFromDuration(durationInput);
    } catch (error) {
        return { error: (error as Error).message };
    }
    const { expiration, duration } = calcResults;

    //Check permissions
    if (!ctx.admin.testPermission('players.ban', modulename)) {
        return { error: 'You don\'t have permission to execute this action.' }
    }

    //Register action
    let actionId;
    try {
        actionId = txCore.database.actions.registerBan(
            identifiers,
            ctx.admin.name,
            reason,
            expiration,
            false
        );

        txCore.discordBot.sendPunishment({
            admin: ctx.admin,
            type: 'danger',
            title: {
                key: 'ban_messages.embed.title',
            },
            description: {
                key: 'ban_messages.embed.idban_description',
                data: {
                    expiration: expiration ? `<t:${expiration}>` : 'X',
                    reason,
                    identifiers: identifiers.join('\n'),
                }
            }
        });
    } catch (error) {
        return { error: `Failed to ban identifiers: ${(error as Error).message}` };
    }
    ctx.admin.logAction(`Banned <${identifiers.join(';')}>: ${reason}`);

    // Dispatch `txAdmin:events:playerBanned`
    try {
        let kickMessage, durationTranslated;
        const tOptions: any = {
            author: ctx.admin.name,
            reason: reason,
        };
        if (expiration !== false && duration) {
            durationTranslated = txCore.translator.tDuration(
                duration * 1000,
                { units: ['d', 'h'] },
            );
            tOptions.expiration = durationTranslated;
            kickMessage = txCore.translator.t('ban_messages.kick_temporary', tOptions);
        } else {
            durationTranslated = null;
            kickMessage = txCore.translator.t('ban_messages.kick_permanent', tOptions);
        }
        txCore.fxRunner.sendEvent('playerBanned', {
            author: ctx.admin.name,
            reason,
            actionId,
            expiration,
            durationInput,
            durationTranslated,
            targetNetId: null,
            targetIds: identifiers,
            targetHwids: [],
            targetName: 'identifiers',
            kickMessage,
        });
    } catch (error) { }

    return { success: true };
}


/**
 * Handle revoke database action.
 * This is called from the player modal or the players page.
 */
async function handleRevokeAction(ctx: AuthedCtx): Promise<GenericApiOkResp> {
    //Checking request
    const schemaRes = revokeActionBodySchema.safeParse(ctx.request.body);
    if (!schemaRes.success) {
        return { error: 'Invalid request body.' };
    }
    const { actionId } = schemaRes.data;

    //Check permissions
    const perms = [];
    if (ctx.admin.hasPermission('players.ban')) perms.push('ban');
    if (ctx.admin.hasPermission('players.warn')) perms.push('warn');

    let action;
    try {
        action = txCore.database.actions.revoke(actionId, ctx.admin.name, perms) as DatabaseActionType;
        ctx.admin.logAction(`Revoked ${action.type} id ${actionId} from ${action.playerName ?? 'identifiers'}`);
        
        txCore.discordBot.sendPunishment({
            admin: ctx.admin,
            type: 'info',
            title: {
                key: 'revocation_messages.embed.title',
                data: {
                    action: action.type,
                },
            },
            description: {
                key: 'revocation_messages.embed.description',
                data: {
                    actionId,
                    action: action.type,
                    target: action.playerName ?? 'identifiers',
                    identifiers: action.ids.join('\n'),
                },
            },
        });
    } catch (error) {
        return { error: `Failed to revoke action: ${(error as Error).message}` };
    }

    // Dispatch `txAdmin:events:actionRevoked`
    try {
        txCore.fxRunner.sendEvent('actionRevoked', {
            actionId: action.id,
            actionType: action.type,
            actionReason: action.reason,
            actionAuthor: action.author,
            playerName: action.playerName,
            playerIds: action.ids,
            playerHwids: 'hwids' in action ? action.hwids : [],
            revokedBy: ctx.admin.name,
        });
    } catch (error) { }

    return { success: true };
}
