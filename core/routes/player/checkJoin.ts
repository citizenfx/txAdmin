const modulename = 'WebServer:PlayerCheckJoin';
import cleanPlayerName from '@shared/cleanPlayerName';
import { GenericApiErrorResp } from '@shared/genericApiTypes';
import { DatabaseActionBanType, DatabaseActionType, DatabaseWhitelistApprovalsType } from '@modules/Database/databaseTypes';
import { anyUndefined, now } from '@lib/misc';
import { filterPlayerHwids, parsePlayerIds, summarizeIdsArray } from '@lib/player/idUtils';
import type { PlayerIdsObjectType } from "@shared/otherTypes";
import { escapeHtmlContent, sanitizeSimpleHtml } from '@lib/htmlRenderSafety';
import playerResolver from '@lib/player/playerResolver';
import { Unit } from 'humanize-duration';
import consoleFactory from '@lib/console';
import { TimeCounter } from '@modules/Metrics/statsUtils';
import { InitializedCtx } from '@modules/WebServer/ctxTypes';
const console = consoleFactory(modulename);

//Helper
const htmlCodeTag = '<code style="background-color: hsl(202deg 40% 66% / 35%); padding: 2px 2px; border-radius: 4px;">';
const htmlCodeIdTag = '<code style="letter-spacing: 2px; background-color: #ff7f5059; padding: 2px 4px; border-radius: 6px;">';
const htmlGuildNameTag = '<strong style="color: cornflowerblue">';
const rejectMessageTemplate = (title: string, content: string) => {
    content = content.replaceAll('<code>', htmlCodeTag);
    content = content.replaceAll('<codeid>', htmlCodeIdTag).replaceAll('</codeid>', '</code>');
    content = content.replaceAll('<guildname>', htmlGuildNameTag).replaceAll('</guildname>', '</strong>');
    return `
    <div style="
        background-color: rgba(30, 30, 30, 0.5);
        padding: 20px;
        border: solid 1.5px #80282B;
        border-radius: 8px;
        margin-top: 25px;
        position: relative;
    ">
        <h2>${title}</h2>
        <br>
        <p style="font-size: 1.25rem; padding: 0px">
            ${content}
        </p>
        <img src="https://forum-cfx-re.akamaized.net/original/5X/2/d/a/6/2da664a84eecb2609d72cf9bb17466d30b53e717.svg" style="
            width: 28px;    
            position: absolute;
            right: -0.5px;
            bottom: -1.0px;
            opacity: 45%;
        ">
    </div>`.replaceAll(/[\r\n]/g, '');
}

const prepCustomMessage = (msg: string) => {
    if (!msg) return '';
    return '<br>' + sanitizeSimpleHtml(msg.trim()).replaceAll(/\n/g, '<br>');
}

//Resp Type
type AllowRespType = {
    allow: true;
}
type DenyRespType = {
    allow: false;
    reason: string;
}
type PlayerCheckJoinApiRespType = AllowRespType | DenyRespType | GenericApiErrorResp;


/**
 * Endpoint for checking a player join, which checks whitelist and bans.
 */
export default async function PlayerCheckJoin(ctx: InitializedCtx) {
    const sendTypedResp = (data: PlayerCheckJoinApiRespType) => ctx.send(data);

    //If checking not required at all
    if (
        !txConfig.banlist.enabled
        && (txConfig.whitelist.mode === 'disabled' || txConfig.whitelist.mode === 'external')
    ) {
        return sendTypedResp({ allow: true });
    }

    //Checking request
    if (anyUndefined(
        ctx.request.body,
        ctx.request.body.playerName,
        ctx.request.body.playerIds,
        ctx.request.body.playerHwids,
    )) {
        return sendTypedResp({ error: 'Invalid request.' });
    }
    const { playerName, playerIds, playerHwids } = ctx.request.body;

    //Validating body data
    if (typeof playerName !== 'string') return sendTypedResp({ error: 'playerName should be an string.' });
    if (!Array.isArray(playerIds)) return sendTypedResp({ error: 'playerIds should be an array.' });
    const { validIdsArray, validIdsObject } = parsePlayerIds(playerIds);
    if (validIdsArray.length < 1) return sendTypedResp({ error: 'Identifiers array must contain at least 1 valid identifier.' });
    if (!Array.isArray(playerHwids)) return sendTypedResp({ error: 'playerHwids should be an array.' });
    const { validHwidsArray } = filterPlayerHwids(playerHwids);


    try {
        // If ban checking enabled
        if (txConfig.banlist.enabled) {
            const checkTime = new TimeCounter();
            const result = checkBan(validIdsArray, validIdsObject, validHwidsArray);
            txCore.metrics.txRuntime.banCheckTime.count(checkTime.stop().milliseconds);
            if (!result.allow) return sendTypedResp(result);
        }

        //Checking whitelist
        if (txConfig.whitelist.mode === 'adminOnly') {
            const checkTime = new TimeCounter();
            const result = await checkAdminOnlyMode(validIdsArray, validIdsObject, playerName);
            txCore.metrics.txRuntime.whitelistCheckTime.count(checkTime.stop().milliseconds);
            if (!result.allow) return sendTypedResp(result);

        } else if (txConfig.whitelist.mode === 'approvedLicense') {
            const checkTime = new TimeCounter();
            const result = await checkApprovedLicense(validIdsArray, validIdsObject, validHwidsArray, playerName);
            txCore.metrics.txRuntime.whitelistCheckTime.count(checkTime.stop().milliseconds);
            if (!result.allow) return sendTypedResp(result);

        } else if (txConfig.whitelist.mode === 'discordMember') {
            const checkTime = new TimeCounter();
            const result = await checkDiscordMember(validIdsArray, validIdsObject, playerName);
            txCore.metrics.txRuntime.whitelistCheckTime.count(checkTime.stop().milliseconds);
            if (!result.allow) return sendTypedResp(result);

        } else if (txConfig.whitelist.mode === 'discordRoles') {
            const checkTime = new TimeCounter();
            const result = await checkDiscordRoles(validIdsArray, validIdsObject, playerName);
            txCore.metrics.txRuntime.whitelistCheckTime.count(checkTime.stop().milliseconds);
            if (!result.allow) return sendTypedResp(result);
        }

        //If not blocked by ban/wl, allow join
        // return sendTypedResp({ allow: false, reason: 'APPROVED, BUT TEMP BLOCKED (DEBUG)' });
        return sendTypedResp({ allow: true });
    } catch (error) {
        const msg = `Failed to check ban/whitelist status: ${(error as Error).message}`;
        console.error(msg);
        console.verbose.dir(error);
        return sendTypedResp({ error: msg });
    }
};


/**
 * Checks if the player is banned
 */
function checkBan(
    validIdsArray: string[],
    validIdsObject: PlayerIdsObjectType,
    validHwidsArray: string[]
): AllowRespType | DenyRespType {
    // Check active bans on matching identifiers
    const ts = now();
    const filter = (action: DatabaseActionType): action is DatabaseActionBanType => {
        return (
            action.type === 'ban'
            && (!action.expiration || action.expiration > ts)
            && (!action.revocation.timestamp)
        );
    };
    const activeBans = txCore.database.actions.findMany(validIdsArray, validHwidsArray, filter);
    if (activeBans.length) {
        const ban = activeBans[0];

        //Translation keys
        const textKeys = {
            title_permanent: txCore.translator.t('ban_messages.reject.title_permanent'),
            title_temporary: txCore.translator.t('ban_messages.reject.title_temporary'),
            label_expiration: txCore.translator.t('ban_messages.reject.label_expiration'),
            label_date: txCore.translator.t('ban_messages.reject.label_date'),
            label_author: txCore.translator.t('ban_messages.reject.label_author'),
            label_reason: txCore.translator.t('ban_messages.reject.label_reason'),
            label_id: txCore.translator.t('ban_messages.reject.label_id'),
            note_multiple_bans: txCore.translator.t('ban_messages.reject.note_multiple_bans'),
            note_diff_license: txCore.translator.t('ban_messages.reject.note_diff_license'),
        };

        //Ban data
        let title;
        let expLine = '';
        if (ban.expiration) {
            const duration = txCore.translator.tDuration(
                (ban.expiration - ts) * 1000,
                {
                    largest: 2,
                    units: ['d', 'h', 'm'] as Unit[],
                },
            );
            expLine = `<strong>${textKeys.label_expiration}:</strong> ${duration} <br>`;
            title = textKeys.title_temporary;
        } else {
            title = textKeys.title_permanent;
        }
        const banDate = new Date(ban.timestamp * 1000).toLocaleString(
            txCore.translator.canonical,
            { dateStyle: 'medium', timeStyle: 'medium' }
        )

        //Ban author
        let authorLine = '';
        if (!txConfig.gameFeatures.hideAdminInPunishments) {
            authorLine = `<strong>${textKeys.label_author}:</strong> ${escapeHtmlContent(ban.author)} <br>`;
        }

        //Informational notes
        let note = '';
        if (activeBans.length > 1) {
            note += `<br>${textKeys.note_multiple_bans}`;
        }
        const bannedLicense = ban.ids.find(id => id.startsWith('license:'));
        if (bannedLicense && validIdsObject.license && bannedLicense.substring(8) !== validIdsObject.license) {
            note += `<br>${textKeys.note_diff_license}`;
        }

        //Prepare rejection message
        const reason = rejectMessageTemplate(
            title,
            `${expLine}
            <strong>${textKeys.label_date}:</strong> ${banDate} <br>
            <strong>${textKeys.label_reason}:</strong> ${escapeHtmlContent(ban.reason)} <br>
            <strong>${textKeys.label_id}:</strong> <codeid>${ban.id}</codeid> <br>
            ${authorLine}
            ${prepCustomMessage(txConfig.banlist.rejectionMessage)}
            <span style="font-style: italic;">${note}</span>`
        );

        //Send serverlog message
        const matchingIds = ban.ids.filter(id => validIdsArray.includes(id));
        const matchingHwids = ('hwids' in ban && ban.hwids)
            ? ban.hwids.filter(hw => validHwidsArray.includes(hw))
            : [];
        const combined = [...matchingIds, ...matchingHwids];
        const summarizedIds = summarizeIdsArray(combined);
        const loggerReason = `active ban (${ban.id}) for identifiers ${summarizedIds}`;
        txCore.logger.server.write([{
            src: 'tx',
            type: 'playerJoinDenied',
            ts,
            data: { reason: loggerReason }
        }]);

        return { allow: false, reason };
    } else {
        return { allow: true };
    }
}


/**
 * Checks if the player is an admin
 */
async function checkAdminOnlyMode(
    validIdsArray: string[],
    validIdsObject: PlayerIdsObjectType,
    playerName: string
): Promise<AllowRespType | DenyRespType> {
    const textKeys = {
        mode_title: txCore.translator.t('whitelist_messages.admin_only.mode_title'),
        insufficient_ids: txCore.translator.t('whitelist_messages.admin_only.insufficient_ids'),
        deny_message: txCore.translator.t('whitelist_messages.admin_only.deny_message'),
    };

    //Check if fivem/discord ids are available
    if (!validIdsObject.fivem && !validIdsObject.discord) {
        return {
            allow: false,
            reason: rejectMessageTemplate(
                textKeys.mode_title,
                textKeys.insufficient_ids
            ),
        }
    }

    //Looking for admin
    const admin = txCore.adminStore.getAdminByIdentifiers(validIdsArray);
    if (admin) return { allow: true };

    //Prepare rejection message
    const reason = rejectMessageTemplate(
        textKeys.mode_title,
        textKeys.deny_message
    );
    return { allow: false, reason };
}


/**
 * Checks if the player is a discord guild member
 */
async function checkDiscordMember(
    validIdsArray: string[],
    validIdsObject: PlayerIdsObjectType,
    playerName: string
): Promise<AllowRespType | DenyRespType> {
    const guildname = `<guildname>${txCore.discordBot.guildName}</guildname>`;
    const textKeys = {
        mode_title: txCore.translator.t('whitelist_messages.guild_member.mode_title'),
        insufficient_ids: txCore.translator.t('whitelist_messages.guild_member.insufficient_ids'),
        deny_title: txCore.translator.t('whitelist_messages.guild_member.deny_title'),
        deny_message: txCore.translator.t('whitelist_messages.guild_member.deny_message', { guildname }),
    };

    //Check if discord id is available
    if (!validIdsObject.discord) {
        return {
            allow: false,
            reason: rejectMessageTemplate(
                textKeys.mode_title,
                textKeys.insufficient_ids
            ),
        }
    }

    //Resolving member
    let errorTitle, errorMessage;
    try {
        const { isMember, memberRoles } = await txCore.discordBot.resolveMemberRoles(validIdsObject.discord);
        if (isMember) {
            return { allow: true };
        } else {
            errorTitle = textKeys.deny_title;
            errorMessage = textKeys.deny_message;
        }
    } catch (error) {
        errorTitle = `Error validating Discord Server Member Allowlist status:`;
        errorMessage = `<code>${(error as Error).message}</code>`;
    }

    //Prepare rejection message
    const reason = rejectMessageTemplate(
        errorTitle,
        `${errorMessage} <br>
        ${prepCustomMessage(txConfig.whitelist.rejectionMessage)}`
    );
    return { allow: false, reason };
}


/**
 * Checks if the player has specific discord guild roles
 */
async function checkDiscordRoles(
    validIdsArray: string[],
    validIdsObject: PlayerIdsObjectType,
    playerName: string
): Promise<AllowRespType | DenyRespType> {
    const guildname = `<guildname>${txCore.discordBot.guildName}</guildname>`;
    const textKeys = {
        mode_title: txCore.translator.t('whitelist_messages.guild_roles.mode_title'),
        insufficient_ids: txCore.translator.t('whitelist_messages.guild_roles.insufficient_ids'),
        deny_notmember_title: txCore.translator.t('whitelist_messages.guild_roles.deny_notmember_title'),
        deny_notmember_message: txCore.translator.t('whitelist_messages.guild_roles.deny_notmember_message', { guildname }),
        deny_noroles_title: txCore.translator.t('whitelist_messages.guild_roles.deny_noroles_title'),
        deny_noroles_message: txCore.translator.t('whitelist_messages.guild_roles.deny_noroles_message', { guildname }),
    };

    //Check if discord id is available
    if (!validIdsObject.discord) {
        return {
            allow: false,
            reason: rejectMessageTemplate(
                textKeys.mode_title,
                textKeys.insufficient_ids
            ),
        }
    }

    //Resolving member
    let errorTitle, errorMessage;
    try {
        const { isMember, memberRoles } = await txCore.discordBot.resolveMemberRoles(validIdsObject.discord);
        if (isMember) {
            const matchingRole = txConfig.whitelist.discordRoles
                .find((requiredRole) => memberRoles?.includes(requiredRole));
            if (matchingRole) {
                return { allow: true };
            } else {
                errorTitle = textKeys.deny_noroles_title;
                errorMessage = textKeys.deny_noroles_message;
            }
        } else {
            errorTitle = textKeys.deny_notmember_title;
            errorMessage = textKeys.deny_notmember_message;
        }
    } catch (error) {
        errorTitle = `Error validating Discord Role Allowlist status:`;
        errorMessage = `<code>${(error as Error).message}</code>`;
    }

    //Prepare rejection message
    const reason = rejectMessageTemplate(
        errorTitle,
        `${errorMessage} <br>
        ${prepCustomMessage(txConfig.whitelist.rejectionMessage)}`
    );
    return { allow: false, reason };
}


/**
 * Checks if the player has a whitelisted license
 */
async function checkApprovedLicense(
    validIdsArray: string[],
    validIdsObject: PlayerIdsObjectType,
    validHwidsArray: string[],
    playerName: string
): Promise<AllowRespType | DenyRespType> {
    const textKeys = {
        mode_title: txCore.translator.t('whitelist_messages.approved_license.mode_title'),
        insufficient_ids: txCore.translator.t('whitelist_messages.approved_license.insufficient_ids'),
        deny_title: txCore.translator.t('whitelist_messages.approved_license.deny_title'),
        request_id_label: txCore.translator.t('whitelist_messages.approved_license.request_id_label'),
    };

    //Check if license is available
    if (!validIdsObject.license) {
        return {
            allow: false,
            reason: rejectMessageTemplate(
                textKeys.mode_title,
                textKeys.insufficient_ids
            ),
        }
    }

    //Finding the player and checking if already whitelisted
    let player;
    try {
        player = playerResolver(null, null, validIdsObject.license);
        const dbData = player.getDbData();
        if (dbData && dbData.tsWhitelisted) {
            return { allow: true };
        }
    } catch (error) { }

    //Common vars
    const { displayName, pureName } = cleanPlayerName(playerName);
    const ts = now();

    //Searching for the license/discord on whitelistApprovals
    const allIdsFilter = (x: DatabaseWhitelistApprovalsType) => {
        return validIdsArray.includes(x.identifier);
    }
    const approvals = txCore.database.whitelist.findManyApprovals(allIdsFilter);
    if (approvals.length) {
        //update or register player
        if (typeof player !== 'undefined' && player.license) {
            player.setWhitelist(true);
        } else {
            txCore.database.players.register({
                license: validIdsObject.license,
                ids: validIdsArray,
                hwids: validHwidsArray,
                displayName,
                pureName,
                playTime: 0,
                tsLastConnection: ts,
                tsJoined: ts,
                tsWhitelisted: ts,
            });
        }

        //Remove entries from whitelistApprovals & whitelistRequests
        txCore.database.whitelist.removeManyApprovals(allIdsFilter);
        txCore.database.whitelist.removeManyRequests({ license: validIdsObject.license });

        //return allow join
        return { allow: true };
    }


    //Player is not whitelisted
    //Resolve player discord
    let discordTag, discordAvatar;
    if (validIdsObject.discord && txCore.discordBot.isClientReady) {
        try {
            const { tag, avatar } = await txCore.discordBot.resolveMemberProfile(validIdsObject.discord);
            discordTag = tag;
            discordAvatar = avatar;
        } catch (error) { }
    }

    //Check if this player has an active wl request
    //NOTE: it could return multiple, but we are not dealing with it
    let wlRequestId: string;
    const requests = txCore.database.whitelist.findManyRequests({ license: validIdsObject.license });
    if (requests.length) {
        wlRequestId = requests[0].id; //just getting the first
        txCore.database.whitelist.updateRequest(validIdsObject.license, {
            playerDisplayName: displayName,
            playerPureName: pureName,
            discordTag,
            discordAvatar,
            tsLastAttempt: ts,
        });
    } else {
        wlRequestId = txCore.database.whitelist.registerRequest({
            license: validIdsObject.license,
            playerDisplayName: displayName,
            playerPureName: pureName,
            discordTag,
            discordAvatar,
            tsLastAttempt: ts,
        });
        txCore.fxRunner.sendEvent('whitelistRequest', {
            action: 'requested',
            playerName: displayName,
            requestId: wlRequestId,
            license: validIdsObject.license,
        });
    }

    //Prepare rejection message
    const reason = rejectMessageTemplate(
        textKeys.deny_title,
        `<strong>${textKeys.request_id_label}:</strong>
        <codeid>${wlRequestId}</codeid> <br>
        ${prepCustomMessage(txConfig.whitelist.rejectionMessage)}`
    );
    return { allow: false, reason }
}
