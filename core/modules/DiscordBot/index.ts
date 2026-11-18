const modulename = 'DiscordBot';
import Discord, { ActivityType, ChannelType, Client, EmbedBuilder, GatewayIntentBits } from 'discord.js';
import slashCommands from './slash';
import interactionCreateHandler from './interactionCreateHandler';
import { generateStatusMessage } from './commands/status';
import consoleFactory from '@lib/console';
import { embedColors } from './discordHelpers';
import { DiscordBotStatus } from '@shared/enums';
import { UpdateConfigKeySet } from '@modules/ConfigStore/utils';
const console = consoleFactory(modulename);


//Types
type MessageTranslationType = {
    key: string;
    data?: object;
}
type AnnouncementType = {
    title?: string | MessageTranslationType;
    description: string | MessageTranslationType;
    type: keyof typeof embedColors;
}

type SpawnConfig = Pick<
    TxConfigs['discordBot'],
    'enabled' | 'token' | 'guild' | 'warningsChannel'
>;


/**
 * Module that handles the discord bot, provides methods to resolve members and send announcements, as well as
 * providing discord slash commands.
 */
export default class DiscordBot {
    //NOTE: only listening to embed changes, as the settings page boots the bot if enabled
    static readonly configKeysWatched = [
        'discordBot.embedJson',
        'discordBot.embedConfigJson',
    ];

    readonly #clientOptions: Discord.ClientOptions = {
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
        ],
        allowedMentions: {
            parse: ['users'],
            repliedUser: true,
        },
        //FIXME: fixme
        // http: {
        //     agent: {
        //         localAddress: txHostConfig.netInterface,
        //     }
        // }
    }
    readonly cooldowns = new Map();
    #client: Client | undefined;
    guild: Discord.Guild | undefined;
    guildName: string | undefined;
    announceChannel: Discord.TextBasedChannel | undefined;
    #lastDisallowedIntentsError: number = 0; //ms
    #lastGuildMembersCacheRefresh: number = 0; //ms
    #lastStatus = DiscordBotStatus.Disabled;
    #lastExplicitStatus = DiscordBotStatus.Disabled;


    constructor() {
        // FIXME: Hacky solution to fix the issue with disallowed intents
        // Remove this when issue below is fixed 
        // https://github.com/discordjs/discord.js/issues/9621
        process.on('unhandledRejection', (error: Error) => {
            if (error.message === 'Used disallowed intents') {
                this.#lastDisallowedIntentsError = Date.now();
            }
        });

        setImmediate(() => {
            if (txConfig.discordBot.enabled) {
                this.startBot()?.catch((e) => { });
            }
        });

        //Cron
        setInterval(() => {
            if (txConfig.discordBot.enabled) {
                this.updateBotStatus().catch((e) => { });
            }
        }, 60_000);
        //Not sure how often do we want to do this, or if we need to do this at all,
        //but previously this was indirectly refreshed every 5 seconds by the health monitor
        setInterval(() => {
            this.refreshWsStatus();
        }, 7500);
    }


    /**
     * Handle updates to the config by resetting the required metrics
     */
    public handleConfigUpdate(updatedConfigs: UpdateConfigKeySet) {
        return this.updateBotStatus();
    }


    /**
     * Called by settings save to attempt to restart the bot with new settings
     */
    async attemptBotReset(botCfg: SpawnConfig | false) {
        this.#lastGuildMembersCacheRefresh = 0;
        if (this.#client) {
            console.warn('Stopping Discord Bot');
            this.#client.destroy();
            this.refreshWsStatus();
            setTimeout(() => {
                if (!botCfg || !botCfg.enabled) this.#client = undefined;
            }, 1000);
        }

        if (botCfg && botCfg.enabled) {
            return await this.startBot(botCfg);
        } else {
            return true;
        }
    }

    /**
     * Passthrough to discord.js isReady()
     */
    get isClientReady() {
        return (this.#client) ? this.#client.isReady() : false;
    }

    /**
     * Passthrough to discord.js websocket status
     */
    get status(): DiscordBotStatus {
        if (!txConfig.discordBot.enabled) {
            return DiscordBotStatus.Disabled;
        } else if (this.#client?.ws.status === Discord.Status.Ready) {
            return DiscordBotStatus.Ready;
        } else {
            return this.#lastExplicitStatus;
        }
    }

    /**
     * Updates the bot client status and pushes to the websocket
     */
    refreshWsStatus() {
        if (this.#lastStatus !== this.status) {
            this.#lastStatus = this.status;
            txCore.webServer.webSocket.pushRefresh('status');
        }
    }


    /**
     * Send an announcement to the configured channel
     */
    async sendAnnouncement(content: AnnouncementType) {
        if (!txConfig.discordBot.enabled) return;
        if (
            !txConfig.discordBot.warningsChannel
            || !this.#client?.isReady()
            || !this.announceChannel
        ) {
            console.verbose.warn('not ready yet to send announcement');
            return false;
        }

        try {
            let title;
            if (content.title) {
                title = (typeof content.title === 'string')
                    ? content.title
                    : txCore.translator.t(content.title.key, content.title.data);
            }
            let description;
            if (content.description) {
                description = (typeof content.description === 'string')
                    ? content.description
                    : txCore.translator.t(content.description.key, content.description.data);
            }

            const embed = new EmbedBuilder({ title, description }).setColor(embedColors[content.type]);
            await this.announceChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error(`Error sending Discord announcement: ${(error as Error).message}`);
        }
    }


    /**
     * Update persistent status and activity
     */
    async updateBotStatus() {
        if (!this.#client?.isReady() || !this.#client.user) {
            console.verbose.warn('not ready yet to update status');
            return false;
        }

        //Updating bot activity
        try {
            const serverClients = txCore.fxPlayerlist.onlineCount;
            const serverMaxClients = txCore.cacheStore.get('fxsRuntime:maxClients') ?? '??';
            const serverName = txConfig.general.serverName;
            const message = `[${serverClients}/${serverMaxClients}] on ${serverName}`;
            this.#client.user.setActivity(message, { type: ActivityType.Watching });
        } catch (error) {
            console.verbose.warn(`Failed to set bot activity: ${(error as Error).message}`);
        }

        //Updating server status embed
        try {
            const oldChannelId = txCore.cacheStore.get('discord:status:channelId');
            const oldMessageId = txCore.cacheStore.get('discord:status:messageId');

            if (typeof oldChannelId === 'string' && typeof oldMessageId === 'string') {
                const oldChannel = await this.#client.channels.fetch(oldChannelId);
                if (!oldChannel) throw new Error(`oldChannel could not be resolved`);
                if (oldChannel.type !== ChannelType.GuildText && oldChannel.type !== ChannelType.GuildAnnouncement) {
                    throw new Error(`oldChannel is not guild text or announcement channel`);
                }
                await oldChannel.messages.edit(oldMessageId, generateStatusMessage());
            }
        } catch (error) {
            console.verbose.warn(`Failed to update status embed: ${(error as Error).message}`);
        }
    }


    /**
     * Starts the discord client
     */
    startBot(botCfg?: SpawnConfig) {
        const isConfigSaveAttempt = !!botCfg;
        botCfg ??= {
            enabled: txConfig.discordBot.enabled,
            token: txConfig.discordBot.token,
            guild: txConfig.discordBot.guild,
            warningsChannel: txConfig.discordBot.warningsChannel,
        }
        if (!botCfg.enabled) return;

        return new Promise<string|void>((resolve, reject) => {
            type ErrorOptData = {
                code?: string;
                clientId?: string;
                prohibitedPermsInUse?: string[];
            }
            const sendError = (msg: string, data: ErrorOptData = {}) => {
                console.error(msg);
                const e = new Error(msg);
                Object.assign(e, data);
                console.warn('Stopping Discord Bot');
                this.#client?.destroy();
                setImmediate(() => {
                    this.#lastExplicitStatus = DiscordBotStatus.Error;
                    this.refreshWsStatus();
                    this.#client = undefined;
                });
                return reject(e);
            }

            //Check for configs
            if (typeof botCfg.token !== 'string' || !botCfg.token.length) {
                return sendError('Discord bot enabled while token is not set.');
            }
            if (typeof botCfg.guild !== 'string' || !botCfg.guild.length) {
                return sendError('Discord bot enabled while guild id is not set.');
            }

            //State check
            if (this.#client && this.#client.ws.status !== 3 && this.#client.ws.status !== 5) {
                console.verbose.warn('Destroying client before restart.');
                this.#client.destroy();
            }

            //Setting up client object
            this.#lastExplicitStatus = DiscordBotStatus.Starting;
            this.refreshWsStatus();
            this.#client = new Client(this.#clientOptions);

            //Setup disallowed intents unhandled rejection watcher
            const lastKnownDisallowedIntentsError = this.#lastDisallowedIntentsError;
            const disallowedIntentsWatcherId = setInterval(() => {
                if (this.#lastDisallowedIntentsError !== lastKnownDisallowedIntentsError) {
                    clearInterval(disallowedIntentsWatcherId);
                    return sendError(
                        `This bot does not have a required privileged intent.`,
                        { code: 'DisallowedIntents' }
                    );
                }
            }, 250);


            //Setup Ready listener
            this.#client.on('ready', async () => {
                clearInterval(disallowedIntentsWatcherId);
                if (!this.#client?.isReady() || !this.#client.user) throw new Error(`ready event while not being ready`);

                //Fetching guild
                const guild = this.#client.guilds.cache.find((guild) => guild.id === botCfg.guild);
                if (!guild) {
                    return sendError(
                        `Discord bot could not resolve guild/server ID ${botCfg.guild}.`,
                        {
                            code: 'CustomNoGuild',
                            clientId: this.#client.user.id
                        }
                    );
                }
                this.guild = guild;
                this.guildName = guild.name;

                //Checking for dangerous permissions
                // https://discord.com/developers/docs/topics/permissions#permissions-bitwise-permission-flags
                // These are the same perms that require 2fa enabled - although it doesn't apply here
                const prohibitedPerms = [
                    'Administrator', //'ADMINISTRATOR',
                    'BanMembers', //'BAN_MEMBERS'
                    'KickMembers', //'KICK_MEMBERS'
                    'ManageChannels', //'MANAGE_CHANNELS',
                    'ManageGuildExpressions', //'MANAGE_GUILD_EXPRESSIONS'
                    'ManageGuild', //'MANAGE_GUILD',
                    'ManageMessages', //'MANAGE_MESSAGES'
                    'ManageRoles', //'MANAGE_ROLES',
                    'ManageThreads', //'MANAGE_THREADS'
                    'ManageWebhooks', //'MANAGE_WEBHOOKS'
                    'ViewCreatorMonetizationAnalytics', //'VIEW_CREATOR_MONETIZATION_ANALYTICS'
                ]
                const botPerms = this.guild.members.me?.permissions.serialize();
                if (!botPerms) {
                    return sendError(`Discord bot could not detect its own permissions.`);
                }
                const prohibitedPermsInUse = Object.entries(botPerms)
                    .filter(([permName, permEnabled]) => prohibitedPerms.includes(permName) && permEnabled)
                    .map((x) => x[0])
                if (prohibitedPermsInUse.length) {
                    const name = this.#client.user.username;
                    if(prohibitedPermsInUse.includes('Administrator')) {
                        return sendError(
                            `This bot (\`${name}\`) has \`Administrator\` permission and for your safety the bot has been disabled.`,
                            { code: 'DangerousPermission' }
                        );
                    } else {
                        const permsList = prohibitedPermsInUse.map((x) => `\`${x}\``).join(', ');
                        const plural = prohibitedPermsInUse.length > 1 ? 'has dangerous permissions' : 'has a dangerous permission';
                        return sendError(
                            `This bot (\`${name}\`) ${plural} (${permsList}) and for your safety the bot has been disabled.`,
                            { code: 'DangerousPermission' }
                        );
                    }
                }

                //Fetching announcements channel
                if (botCfg.warningsChannel) {
                    const fetchedChannel = this.#client.channels.cache.find((x) => x.id === botCfg.warningsChannel);
                    if (!fetchedChannel) {
                        return sendError(`Channel ${botCfg.warningsChannel} not found.`);
                    } else if (fetchedChannel.type !== ChannelType.GuildText && fetchedChannel.type !== ChannelType.GuildAnnouncement) {
                        return sendError(`Channel ${botCfg.warningsChannel} - ${(fetchedChannel as any)?.name} is not a text or announcement channel.`);
                    } else {
                        this.announceChannel = fetchedChannel;
                    }
                }

                // if previously registered by tx before v6 or other bot
                this.guild.commands.set(slashCommands).catch(console.dir);
                this.#client.application?.commands.set([]).catch(console.dir);

                //The settings save will the updateBotStatus, so no need to call it here
                if (!isConfigSaveAttempt) {
                    this.updateBotStatus().catch((e) => { });
                }

                const successMsg = `Discord bot running as \`${this.#client.user.tag}\` on \`${guild.name}\`.`;
                console.ok(successMsg);
                this.refreshWsStatus();
                return resolve(successMsg);
            });

            //Setup remaining event listeners
            this.#client.on('error', (error) => {
                this.refreshWsStatus();
                clearInterval(disallowedIntentsWatcherId);
                console.error(`Error from Discord.js client: ${error.message}`);
                return reject(error);
            });
            this.#client.on('resume', () => {
                console.verbose.ok('Connection with Discord API server resumed');
                this.updateBotStatus().catch((e) => { });
                this.refreshWsStatus();
            });
            this.#client.on('interactionCreate', interactionCreateHandler);
            // this.#client.on('debug', console.verbose.debug);

            //Start bot
            this.#client.login(botCfg.token).catch((error) => {
                clearInterval(disallowedIntentsWatcherId);

                //for some reason, this is not throwing unhandled rejection anymore /shrug
                if (error.message === 'Used disallowed intents') {
                    return sendError(
                        `This bot does not have a required privileged intent.`,
                        { code: 'DisallowedIntents' }
                    );
                }

                //set status to error
                this.#lastExplicitStatus = DiscordBotStatus.Error;
                this.refreshWsStatus();

                //if no message, create one
                if (!('message' in error) || !error.message) {
                    error.message = 'no reason available - ' + JSON.stringify(error);
                }
                console.error(`Discord login failed with error: ${error.message}`);
                return reject(error);
            });
        });
    }

    /**
     * Refreshes the bot guild member cache
     */
    async refreshMemberCache() {
        if (!txConfig.discordBot.enabled) throw new Error(`discord bot is disabled`);
        if (!this.#client?.isReady()) throw new Error(`discord bot not ready yet`);
        if (!this.guild) throw new Error(`guild not resolved`);

        //Check when the cache was last refreshed
        const currTs = Date.now();
        if (currTs - this.#lastGuildMembersCacheRefresh > 60_000) {
            try {
                await this.guild.members.fetch();
                this.#lastGuildMembersCacheRefresh = currTs;
                return true;
            } catch (error) {
                return false;
            }
        }
        return false;
    }


    /**
     * Return if an ID is a guild member, and their roles
     */
    async resolveMemberRoles(uid: string) {
        if (!txConfig.discordBot.enabled) throw new Error(`discord bot is disabled`);
        if (!this.#client?.isReady()) throw new Error(`discord bot not ready yet`);
        if (!this.guild) throw new Error(`guild not resolved`);

        //Try to get member from cache or refresh cache then try again
        let member = this.guild.members.cache.find(m => m.id === uid);
        if (!member && await this.refreshMemberCache()) {
            member = this.guild.members.cache.find(m => m.id === uid);
        }

        //Return result
        if (member) {
            return {
                isMember: true,
                memberRoles: member.roles.cache.map((role) => role.id),
            };
        } else {
            return { isMember: false }
        }
    }


    /**
     * Resolves a user by its discord identifier.
     */
    async resolveMemberProfile(uid: string) {
        if (!this.#client?.isReady()) throw new Error(`discord bot not ready yet`);
        const avatarOptions: Discord.ImageURLOptions = { size: 64, forceStatic: true };

        //Check if in guild member
        if (this.guild) {
            //Try to get member from cache or refresh cache then try again
            let member = this.guild.members.cache.find(m => m.id === uid);
            if (!member && await this.refreshMemberCache()) {
                member = this.guild.members.cache.find(m => m.id === uid);
            }

            if (member) {
                return {
                    tag: member.nickname ?? member.user.username,
                    avatar: member.displayAvatarURL(avatarOptions) ?? member.user.displayAvatarURL(avatarOptions),
                };
            }
        }

        //Checking if user resolvable
        //NOTE: this one might still spam the API
        // https://discord.js.org/#/docs/discord.js/14.11.0/class/UserManager?scrollTo=fetch
        const user = await this.#client.users.fetch(uid);
        if (user) {
            return {
                tag: user.username,
                avatar: user.displayAvatarURL(avatarOptions),
            };
        } else {
            throw new Error(`could not resolve discord user`);
        }
    }
};
