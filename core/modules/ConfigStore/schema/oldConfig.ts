import { dequal } from 'dequal/lite';
import parseArgsStringToArgv from "string-argv";
import { ConfigSchemas_v2 } from "./index";
import { ListOf } from "./utils";
import { genBanTemplateId } from "./banlist";
import { getConfigDefaults } from "../configParser";
import { confx } from "../utils";

const restructureOldConfig = (old: any) => {
    //Apply the legacy migrations (mutation)
    old.playerDatabase ??= old.playerDatabase ?? old.playerController ?? {};
    if (old.global.language === 'pt_PT' || old.global.language === 'pt_BR') {
        old.global.language = 'pt';
    }
    if (typeof old.monitor.resourceStartingTolerance === 'string') {
        old.monitor.resourceStartingTolerance = parseInt(old.monitor.resourceStartingTolerance);
        if (isNaN(old.monitor.resourceStartingTolerance)) {
            old.monitor.resourceStartingTolerance = 120;
        }
    }

    //Remap the old config to the new structure
    const remapped: TxConfigs = {
        general: { //NOTE:renamed
            serverName: old?.global?.serverName,
            language: old?.global?.language,
        },
        webServer: {
            disableNuiSourceCheck: old?.webServer?.disableNuiSourceCheck,
            limiterMinutes: old?.webServer?.limiterMinutes,
            limiterAttempts: old?.webServer?.limiterAttempts,
        },
        discordBot: {
            enabled: old?.discordBot?.enabled,
            token: old?.discordBot?.token,
            guild: old?.discordBot?.guild,
            punishmentsChannel: old?.discordBot?.punishmentsChannel,
            announcementsChannel: old?.discordBot?.announceChannel, //NOTE:renamed
            embedJson: old?.discordBot?.embedJson,
            embedConfigJson: old?.discordBot?.embedConfigJson,
        },
        server: {//NOTE:renamed
            dataPath: old?.fxRunner?.serverDataPath, //NOTE:renamed
            cfgPath: old?.fxRunner?.cfgPath,
            startupArgs: old?.fxRunner?.commandLine, //NOTE:renamed
            onesync: old?.fxRunner?.onesync,
            autoStart: old?.fxRunner?.autostart, //NOTE:renamed
            quiet: old?.fxRunner?.quiet,
            shutdownNoticeDelayMs: old?.fxRunner?.shutdownNoticeDelay, //NOTE:renamed
            restartSpawnDelayMs: old?.fxRunner?.restartDelay, //NOTE:renamed
        },
        restarter: {
            schedule: old?.monitor?.restarterSchedule,  //NOTE:renamed
            bootGracePeriod: old?.monitor?.cooldown, //NOTE:renamed
            resourceStartingTolerance: old?.monitor?.resourceStartingTolerance,
        },
        banlist: { //NOTE: All Renamed
            enabled: old?.playerDatabase?.onJoinCheckBan,
            rejectionMessage: old?.playerDatabase?.banRejectionMessage,
            requiredHwidMatches: old?.playerDatabase?.requiredBanHwidMatches,
            templates: old?.banTemplates,
        },
        whitelist: { //NOTE: All Renamed
            mode: old?.playerDatabase?.whitelistMode,
            rejectionMessage: old?.playerDatabase?.whitelistRejectionMessage,
            discordRoles: old?.playerDatabase?.whitelistedDiscordRoles,
        },
        gameFeatures: {
            menuEnabled: old?.global?.menuEnabled,
            menuAlignRight: old?.global?.menuAlignRight,
            menuPageKey: old?.global?.menuPageKey,
            playerModePtfx: true, //NOTE: new config
            hideAdminInPunishments: old?.global?.hideAdminInPunishments,
            hideAdminInMessages: old?.global?.hideAdminInMessages,
            hideDefaultAnnouncement: old?.global?.hideDefaultAnnouncement,
            hideDefaultDirectMessage: old?.global?.hideDefaultDirectMessage,
            hideDefaultWarning: old?.global?.hideDefaultWarning,
            hideDefaultScheduledRestartWarning: old?.global?.hideDefaultScheduledRestartWarning,
        },
        logger: {
            admin: old?.logger?.admin,
            fxserver: old?.logger?.fxserver,
            server: old?.logger?.server,
        },
    }

    return remapped;
};


export const migrateOldConfig = (old: any) => {
    //Get the old configs in the new structure
    const remapped = restructureOldConfig(old) as any;

    //Some migrations before comparing because defaults changed
    if (typeof remapped.restarter?.bootGracePeriod === 'number') {
        remapped.restarter.bootGracePeriod = Math.round(remapped.restarter.bootGracePeriod);
        if (remapped.restarter.bootGracePeriod === 60) {
            remapped.restarter.bootGracePeriod = 45;
        }
    }
    if (typeof remapped.server?.shutdownNoticeDelayMs === 'number') {
        remapped.server.shutdownNoticeDelayMs *= 1000;
    }
    if (remapped.server?.restartSpawnDelayMs === 750) {
        remapped.server.restartSpawnDelayMs = 500;
    }
    if (remapped.whitelist?.mode === 'guildMember') {
        remapped.whitelist.mode = 'discordMember';
    }
    if (remapped.whitelist?.mode === 'guildRoles') {
        remapped.whitelist.mode = 'discordRoles';
    }

    //Migrating the menu ptfx convar (can't do anything about it being set in server.cfg tho)
    if (typeof remapped.server?.startupArgs === 'string') {
        try {
            const str = remapped.server.startupArgs.trim();
            const convarSetRegex = /\+setr?\s+['"]?txAdmin-menuPtfxDisable['"]?\s+['"]?(?<value>\w+)['"]?\s?/g;
            const matches = [...str.matchAll(convarSetRegex)];
            if (matches.length) {
                const valueSet = matches[matches.length - 1].groups?.value;
                remapped.gameFeatures.playerModePtfx = valueSet !== 'true';
                remapped.server.startupArgs = str.replaceAll(convarSetRegex, '');
            }
        } catch (error) {
            console.warn('Failed to migrate the menuPtfxDisable convar. Assuming it\'s unset.');
            console.verbose.dir(error);
        }
        remapped.server.startupArgs = remapped.server.startupArgs.length
            ? parseArgsStringToArgv(remapped.server.startupArgs)
            : [];
    }

    //Removing stuff from unconfigured profile
    if (remapped.general?.serverName === null) {
        delete remapped.general.serverName;
    }
    if (remapped.server?.cfgPath === null) {
        delete remapped.server.cfgPath;
    }

    //Extract just the non-default values
    const baseConfigs = getConfigDefaults(ConfigSchemas_v2) as TxConfigs;
    const justNonDefaults: ListOf<any> = {};
    for (const [scopeName, scopeConfigs] of Object.entries(baseConfigs)) {
        for (const [configKey, configDefault] of Object.entries(scopeConfigs)) {
            const configValue = confx(remapped).get(scopeName, configKey);
            if (configValue === undefined) continue;
            if (!dequal(configValue, configDefault)) {
                confx(justNonDefaults).set(scopeName, configKey, configValue);
            }
        }
    }

    //Last migrations
    if (typeof justNonDefaults.general?.serverName === 'string') {
        justNonDefaults.general.serverName = justNonDefaults.general.serverName.slice(0, 18);
    }
    if (Array.isArray(justNonDefaults.banlist?.templates)) {
        for (const tpl of justNonDefaults.banlist.templates) {
            if (typeof tpl.id !== 'string') continue;
            tpl.id = genBanTemplateId();
        }
    }

    //Final object
    return justNonDefaults;
}
