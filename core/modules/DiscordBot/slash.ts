import { ApplicationCommandDataResolvable, ApplicationCommandOptionType, ApplicationCommandType } from 'discord.js';


const statusCommand: ApplicationCommandDataResolvable = {
    type: ApplicationCommandType.ChatInput,
    name: 'status',
    description: 'Adds or removes the configurable, persistent, auto-updated embed.',
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: 'add',
            description: 'Creates a configurable, persistent, auto-updated embed with server status.'
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: 'remove',
            description: 'Removes the configured persistent txAdmin status embed.'
        }
    ]
}

const whitelistCommand: ApplicationCommandDataResolvable = {
    type: ApplicationCommandType.ChatInput,
    name: 'whitelist',
    description: 'Whitelist embed commands.',
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: 'member',
            description: 'Adds a member to the whitelist approvals.',
            options: [
                {
                    type: ApplicationCommandOptionType.User,
                    name: 'member',
                    description: 'The member that will be whitelisted.',
                    required: true,
                }
            ]
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: 'request',
            description: 'Approves a whitelist request ID (eg R1234).',
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: 'id',
                    description: 'The ID of the request (eg R1234).',
                    required: true,
                    minLength: 5,
                    maxLength: 5,
                }
            ]
        }
    ]
}
const allowlistCommand: ApplicationCommandDataResolvable = {
    type: ApplicationCommandType.ChatInput,
    name: 'allowlist',
    description: 'Allowlist embed commands.',
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: 'member',
            description: 'Adds a member to the allowlist approvals.',
            options: [
                {
                    type: ApplicationCommandOptionType.User,
                    name: 'member',
                    description: 'The member that will be allowlisted.',
                    required: true,
                }
            ]
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: 'request',
            description: 'Approves a allowlist request ID (eg R1234).',
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: 'id',
                    description: 'The ID of the request (eg R1234).',
                    required: true,
                    minLength: 5,
                    maxLength: 5,
                }
            ]
        }
    ]
}

const infoCommand: ApplicationCommandDataResolvable = {
    type: ApplicationCommandType.ChatInput,
    name: 'info',
    description: 'Searches for a player in the txAdmin Database and prints information.',
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: 'self',
            description: 'Searches for whomever is using the command.',
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: 'member',
            description: 'Searches for a player with matching Discord ID.',
            options: [
                {
                    type: ApplicationCommandOptionType.User,
                    name: 'member',
                    description: 'The member that will be searched for.',
                    required: true,
                },
                {
                    type: ApplicationCommandOptionType.Boolean,
                    name: 'admininfo',
                    description: 'For admins to show identifiers and history information.'
                }
            ]
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: 'id',
            description: 'Searches for an identifier.',
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: 'id',
                    description: 'The ID to search for (eg fivem:271816).',
                    required: true,
                    minLength: 5,
                },
                {
                    type: ApplicationCommandOptionType.Boolean,
                    name: 'admininfo',
                    description: 'For admins to show identifiers and history information.'
                }
            ]
        },
    ]
}

/**
 * Exported commands
 */
export default [
    statusCommand,
    whitelistCommand,
    allowlistCommand,
    infoCommand,
] as ApplicationCommandDataResolvable[];
