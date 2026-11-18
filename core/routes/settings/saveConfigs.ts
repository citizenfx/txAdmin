const modulename = 'WebServer:SettingsPage';
import consoleFactory from '@lib/console';
import fsp from 'node:fs/promises';
import path from 'node:path';
import slash from 'slash';
import type { AuthedCtx } from '@modules/WebServer/ctxTypes';
import type { ApiToastResp } from '@shared/genericApiTypes';
import type { PartialTxConfigs, PartialTxConfigsToSave } from '@modules/ConfigStore/schema';
import type { ConfigChangelogEntry } from '@shared/otherTypes';
import { z } from 'zod';
import { fromError } from 'zod-validation-error';
import Translator, { localeFileSchema } from '@modules/Translator';
import ConfigStore from '@modules/ConfigStore';
import { resolveCFGFilePath } from '@lib/fxserver/fxsConfigHelper';
import { findPotentialServerDataPaths, isValidServerDataPath } from '@lib/fxserver/serverData';
import { getFsErrorMdMessage } from '@lib/fs';
import { generateStatusMessage } from '@modules/DiscordBot/commands/status';
import { getSchemaChainError } from '@modules/ConfigStore/schema/utils';
import { confx } from '@modules/ConfigStore/utils';
import { SYM_RESET_CONFIG } from '@lib/symbols';
const console = consoleFactory(modulename);


//Types
export type SaveConfigsReq = {
    resetKeys: string[];
    changes: PartialTxConfigs,
};
export type SaveConfigsResp = ApiToastResp & {
    stored?: PartialTxConfigs;
    changelog?: ConfigChangelogEntry[];
};

type SendTypedResp = (data: SaveConfigsResp) => void;
type CardHandlerSuccessResp = {
    processedConfig: PartialTxConfigsToSave;
    successToast?: ApiToastResp;
}
type CardHandler = (
    inputConfig: PartialTxConfigsToSave,
    sendTypedResp: SendTypedResp
) => Promise<CardHandlerSuccessResp | void>;

//Known cards
const cardNamesMap = {
    general: 'General',
    fxserver: 'FXServer',
    bans: 'Bans',
    // FIXME:NEXT:UPDATE rename
    whitelist: 'Whitelist',
    discord: 'Discord',
    'game-menu': 'Game Menu',
    'game-notifications': 'Game Notifications',
} as const;
const validCardIds = Object.keys(cardNamesMap) as [keyof typeof cardNamesMap];

//Req validation
const paramsSchema = z.object({ card: z.enum(validCardIds) });
const bodySchema = z.object({
    resetKeys: z.array(z.string()),
    changes: z.object({}).passthrough(),
});

//Helper to clean paths
const cleanPath = (x: string) => slash(path.normalize(x));


/**
 * Processes a settings save request
 * NOTE: the UI trims all strings
 */
export default async function SaveSettingsConfigs(ctx: AuthedCtx) {
    const sendTypedResp = (data: SaveConfigsResp) => ctx.send(data);

    //Check permissions
    if (!ctx.admin.testPermission('settings.write', modulename)) {
        return sendTypedResp({
            type: 'error',
            msg: 'You don\'t have permission to execute this action.',
        });
    }

    //Validating input
    const paramsSchemaRes = paramsSchema.safeParse(ctx.params);
    const bodySchemaRes = bodySchema.safeParse(ctx.request.body);
    if (!paramsSchemaRes.success || !bodySchemaRes.success) {
        return sendTypedResp({
            type: 'error',
            md: true,
            title: 'Invalid Request',
            msg: fromError(
                paramsSchemaRes.error ?? bodySchemaRes.error,
                { prefix: null }
            ).message,
        });
    }
    const cardId = paramsSchemaRes.data.card;
    const { resetKeys, changes: inputConfig } = bodySchemaRes.data;
    const cardName = cardNamesMap[ctx.params.card as keyof typeof cardNamesMap] ?? 'UNKNOWN';

    // FIXME:NEXT:UPDATE remove
    const displayCardName = cardName === 'Whitelist' ? 'Allowlist' : cardName;

    //Delegate to the specific card handlers - if required
    let handlerResp: CardHandlerSuccessResp | void = { processedConfig: inputConfig };
    try {
        if (cardId === 'general') {
            handlerResp = await handleGeneralCard(inputConfig, sendTypedResp);
        } else if (cardId === 'fxserver') {
            handlerResp = await handleFxserverCard(inputConfig, sendTypedResp);
        } else if (cardId === 'discord') {
            handlerResp = await handleDiscordCard(inputConfig, sendTypedResp);
        }
    } catch (error) {
        return sendTypedResp({
            type: 'error',
            md: true,
            title: `Error processing the ${displayCardName} changes.`,
            msg: (error as any).message,
        });
    }
    if (!handlerResp) return; //resp already sent

    //Apply reset keys
    const configChanges = handlerResp.processedConfig;
    try {
        for (const config of resetKeys) {
            const [scope, key] = config.split('.');
            if (!scope || !key) throw new Error(`Invalid reset key: \`${config}\``);
            confx(configChanges).set(scope, key, SYM_RESET_CONFIG);
        }
    } catch (error) {
        return sendTypedResp({
            type: 'error',
            md: true,
            title: `Error processing the ${displayCardName} changes.`,
            msg: (error as any).message,
        });
    }

    //Save the changes
    try {
        const changes = txCore.configStore.saveConfigs(configChanges, ctx.admin.name);
        if (changes.hasMatch(['server.dataPath', 'server.cfgPath'])) {
            txCore.webServer.webSocket.pushRefresh('status');
        }
        return sendTypedResp({
            type: 'success',
            msg: `${displayCardName} Settings saved!`,
            ...(handlerResp?.successToast ?? {}),
            stored: txCore.configStore.getStoredConfig(),
            changelog: txCore.configStore.getChangelog(),
        });
    } catch (error) {
        const cardName = cardNamesMap[ctx.params.card as keyof typeof cardNamesMap] ?? 'UNKNOWN';
        return sendTypedResp({
            type: 'error',
            md: true,
            title: `Error saving the ${displayCardName} changes.`,
            msg: (error as any).message,
        });
    }
};


/**
 * General card handler
 */
const handleGeneralCard: CardHandler = async (inputConfig, sendTypedResp) => {
    //Validates custom language file
    if (inputConfig.general?.language === undefined) throw new Error(`Unexpected data for the 'general' card.`);
    if (inputConfig.general.language === 'custom') {
        try {
            const raw = await fsp.readFile(txCore.translator.customLocalePath, 'utf8');
            if (!raw.length) throw new Error('The \`locale.json\` file is empty.');
            const parsed = JSON.parse(raw);
            const locale = localeFileSchema.parse(parsed);
            if (!Translator.humanizerLanguages.includes(locale.$meta.humanizer_language)) {
                throw new Error(`Invalid humanizer language: \`${locale.$meta.humanizer_language}\`.`);
            }
        } catch (error) {
            let msg = (error as Error).message;
            if (error instanceof Error) {
                if (error.message.includes('ENOENT')) {
                    msg = `Could not find the custom language file:\n\`${txCore.translator.customLocalePath}\``;
                } else if (error.message.includes('JSON')) {
                    msg = 'The custom language file contains invalid JSON.';
                } else if (error instanceof z.ZodError) {
                    msg = fromError(error, { prefix: 'Invalid Locale Metadata' }).message;
                }
            }
            return sendTypedResp({
                type: 'error',
                title: 'Custom Language Error',
                md: true,
                msg,
            });
        }
    }

    return { processedConfig: inputConfig };
}


/**
 * FXServer card handler
 */
const handleFxserverCard: CardHandler = async (inputConfig, sendTypedResp) => {
    // if (typeof inputConfig.server?.dataPath === 'string' && inputConfig.server.dataPath.length) {
    //     inputConfig.server.dataPath = cleanPath(inputConfig.server.dataPath + '/');
    // }
    if (typeof inputConfig.server?.dataPath !== 'string' || !inputConfig.server?.dataPath.length) {
        throw new Error(`Unexpected data for the 'fxserver' card.`);
    }

    //Validating Server Data Path
    const dataPath = inputConfig.server.dataPath;
    try {
        const isValid = await isValidServerDataPath(dataPath);
        if (!isValid) throw new Error(`unexpected isValidServerDataPath response`);
    } catch (error) {
        try {
            const potentialFix = await findPotentialServerDataPaths(dataPath);
            if (potentialFix) {
                return sendTypedResp({
                    type: 'error',
                    title: 'Server Data Folder Error',
                    md: true,
                    msg: `The path provided is not valid.\n\nDid you mean this path?\n\`${cleanPath(potentialFix)}\``,
                });
            }
        } catch (error2) { }
        return sendTypedResp({
            type: 'error',
            title: 'Server Data Folder Error',
            md: true,
            msg: (error as any).message,
        });
    }


    //Validating CFG Path
    let cfgPath = txConfig.server.cfgPath;
    if (inputConfig.server?.cfgPath !== undefined) {
        const res = ConfigStore.Schema.server.cfgPath.validator.safeParse(inputConfig.server.cfgPath);
        if (!res.success) {
            return sendTypedResp({
                type: 'error',
                title: 'Invalid CFG Path',
                md: true,
                msg: fromError(res.error, { prefix: null }).message,
            });
        }
        cfgPath = res.data;
    }

    try {
        cfgPath = resolveCFGFilePath(cfgPath, dataPath);
        const cfgFileStat = await fsp.stat(cfgPath);
        if (!cfgFileStat.isFile()) {
            throw new Error('The path provided is not a file');
        }
    } catch (error) {
        return sendTypedResp({
            type: 'error',
            title: 'CFG Path Error',
            md: true,
            msg: getFsErrorMdMessage(error, cleanPath(cfgPath)),
        });
    }

    //FIXME: implement findLikelyCFGPath in here


    //Final cleanup
    if (typeof inputConfig.server?.dataPath === 'string') {
        inputConfig.server.dataPath = cleanPath(inputConfig.server.dataPath);
    }
    if (typeof inputConfig.server?.cfgPath === 'string') {
        inputConfig.server.cfgPath = cleanPath(inputConfig.server.cfgPath);
    }

    return {
        processedConfig: inputConfig,
        successToast: {
            type: 'success',
            title: 'FXServer Settings Saved!',
            msg: 'You need to restart the server for the changes to take effect.',
        }
    };
}


/**
 * Discord card handler
 */
const handleDiscordCard: CardHandler = async (inputConfig, sendTypedResp) => {
    if (!inputConfig.discordBot) throw new Error(`Unexpected data for the 'discord' card.`);

    //Validating embed JSONs
    //NOTE: need this before checking if enabled, or while disabled one could save invalid JSON
    if (typeof inputConfig.discordBot.embedJson === 'string' || typeof inputConfig.discordBot.embedConfigJson === 'string') {
        try {
            generateStatusMessage(
                inputConfig.discordBot.embedJson as string | undefined ?? txConfig.discordBot.embedJson,
                inputConfig.discordBot.embedConfigJson as string | undefined ?? txConfig.discordBot.embedConfigJson,
            );
        } catch (error) {
            return sendTypedResp({
                type: 'error',
                title: 'Embed validation failed:',
                md: true,
                msg: (error as Error).message,
            });
        }
    }

    //If bot disabled, kill the bot and don't validate anything
    if (!inputConfig.discordBot?.enabled) {
        await txCore.discordBot.attemptBotReset(false);
        return { processedConfig: inputConfig };
    }

    //Validating fields manually before trying to start the bot
    const baseError = {
        type: 'error',
        title: 'Discord Bot Error',
        md: true,
    } as const;
    const schemas = ConfigStore.Schema.discordBot;
    const validationError = getSchemaChainError([
        [schemas.enabled, inputConfig.discordBot.enabled],
        [schemas.token, inputConfig.discordBot.token],
        [schemas.guild, inputConfig.discordBot.guild],
        [schemas.warningsChannel, inputConfig.discordBot.warningsChannel],
    ]);
    if (validationError) {
        return sendTypedResp({
            ...baseError,
            msg: validationError,
        });
    }

    //Checking if required fields are present (frontend should have done this already)
    if (
        !inputConfig.discordBot.token
        || !inputConfig.discordBot.guild
    ) {
        return sendTypedResp({
            ...baseError,
            msg: 'Missing required fields to enable the bot.',
        });
    }

    //Restarting discord bot
    let successMsg;
    try {
        successMsg = await txCore.discordBot.attemptBotReset({
            enabled: true,
            //They have been validated, so this is fine
            token: inputConfig.discordBot.token as any,
            guild: inputConfig.discordBot.guild as any,
            warningsChannel: inputConfig.discordBot.warningsChannel as any,
        });
    } catch (error) {
        const errorCode = (error as any).code;
        let extraContext = '';
        if (errorCode === 'DisallowedIntents' || errorCode === 4014) {
            extraContext = `**The bot requires the \`GUILD_MEMBERS\` intent.**
            - Go to the [Discord Dev Portal](https://discord.com/developers/applications)
            - Navigate to \`Bot > Privileged Gateway Intents\`.
            - Enable the \`GUILD_MEMBERS\` intent.
            - Press save on the developer portal.
            - Go to the \`txAdmin > Settings > Discord Bot\` and press save.`;
        } else if (errorCode === 'CustomNoGuild') {
            const inviteUrl = ('clientId' in (error as any))
                ? `https://discord.com/oauth2/authorize?client_id=${(error as any).clientId}&scope=bot&permissions=0`
                : `https://discordapi.com/permissions.html#0`
            extraContext = `**This usually mean one of the issues below:**
            - **Wrong server ID:** read the description of the server ID setting for more information.
            - **Bot is not in the server:** you need to [INVITE THE BOT](${inviteUrl}) to join the server.
            - **Wrong bot:** you may be using the token of another discord bot.`;
        } else if (errorCode === 'DangerousPermission') {
            extraContext = `To enable the bot, you need to remove the permissions listed above, which can be done in the Discord Server role configuration page. Please check every single role that the bot has, including the \`@everyone\` role.
            **Please keep in mind that:**
            - These permissions are dangerous because if the bot token leaks, an attacker can cause permanent damage to your server.
            - No bot should have more permissions than strictly needed, especially \`Administrator\`.
            - You should never have multiple bots using the same token, create a new one for each bot.`;
        }
        return sendTypedResp({
            ...baseError,
            title: 'Error starting the bot:',
            msg: `${(error as Error).message}\n${extraContext}`.trim(),
        });
    }

    return {
        processedConfig: inputConfig,
        successToast: {
            type: 'success',
            md: true,
            title: 'Discord Bot Settings Saved!',
            msg: `${successMsg}\nIf _(and only if)_ the status embed is not being updated, check the [System > Console Log](/system/console-log) page to look for embed errors.`,
        }
    };
}
