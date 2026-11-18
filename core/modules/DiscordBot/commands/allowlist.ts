const modulename = 'DiscordBot:cmd:whitelist';
import { CommandInteraction as ChatInputCommandInteraction, ImageURLOptions } from 'discord.js';
import { now } from '@lib/misc';
import { DuplicateKeyError } from '@modules/Database/dbUtils';
import { embedder, ensurePermission, logDiscordAdminAction } from '../discordHelpers';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);


/**
 * Command /whitelist member <mention>
 */
const handleMemberSubcommand = async (interaction: ChatInputCommandInteraction, adminName: string) => {
    //Preparing player id/name/avatar
    const member = interaction.options.getMember('member');
    if(!member || !('user' in member)){
        return await interaction.reply(embedder.danger(`Failed to resolve member ID.`));
    }
    const identifier = `discord:${member.id}`;
    const playerName = member.nickname ?? member.user.username;
    const avatarOptions: ImageURLOptions = { size: 64, forceStatic: true };
    const playerAvatar = member.displayAvatarURL(avatarOptions) ?? member.user.displayAvatarURL(avatarOptions);

    //Registering approval
    try {
        txCore.database.whitelist.registerApproval({
            identifier,
            playerName,
            playerAvatar,
            tsApproved: now(),
            approvedBy: adminName,
        });
        txCore.fxRunner.sendEvent('whitelistPreApproval', {
            action: 'added',
            identifier,
            playerName,
            adminName,
        });
    } catch (error) {
        return await interaction.reply(embedder.danger(`Failed to save allowlist approval: ${(error as Error).message}`));
    }

    const msg = `Added allowlist approval for ${playerName}.`;
    logDiscordAdminAction(adminName, msg);
    return await interaction.reply(embedder.success(msg));
}


/**
 * Command /whitelist request <id>
 */
const handleRequestSubcommand = async (interaction: ChatInputCommandInteraction, adminName: string) => {
    //@ts-ignore: somehow vscode is resolving interaction as CommandInteraction
    const input = interaction.options.getString('id', true);
    const reqId = input.trim().toUpperCase();
    if (reqId.length !== 5 || reqId[0] !== 'R') {
        return await interaction.reply(embedder.danger('Invalid request ID.'));
    }

    //Find request
    const requests = txCore.database.whitelist.findManyRequests({ id: reqId });
    if (!requests.length) {
        return await interaction.reply(embedder.warning(`Allowlist request ID \`${reqId}\` not found.`));
    }
    const req = requests[0]; //just getting the first

    //Register whitelistApprovals
    const identifier = `license:${req.license}`;
    const playerName = req.discordTag ?? req.playerDisplayName;
    try {
        txCore.database.whitelist.registerApproval({
            identifier,
            playerName,
            playerAvatar: (req.discordAvatar) ? req.discordAvatar : null,
            tsApproved: now(),
            approvedBy: adminName,
        });
        txCore.fxRunner.sendEvent('whitelistRequest', {
            action: 'approved',
            playerName,
            requestId: req.id,
            license: req.license,
            adminName,
        });
    } catch (error) {
        if (!(error instanceof DuplicateKeyError)) {
            return await interaction.reply(embedder.danger(`Failed to save allowlist approval: ${(error as Error).message}`));
        }
    }

    //Remove record from whitelistRequests
    try {
        txCore.database.whitelist.removeManyRequests({ id: reqId });
    } catch (error) {
        return await interaction.reply(embedder.danger(`Failed to remove allowlist request: ${(error as Error).message}`));
    }

    const msg = `Approved allowlist request \`${reqId}\` from ${playerName}.`;
    logDiscordAdminAction(adminName, msg);
    return await interaction.reply(embedder.success(msg));
}


/**
 * Handler for /whitelist
 */
export default async (interaction: ChatInputCommandInteraction) => {
    //Check permissions
    const adminName = await ensurePermission(interaction, 'players.whitelist');
    if (typeof adminName !== 'string') return;

    //@ts-ignore: somehow vscode is resolving interaction as CommandInteraction
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'member') {
        return await handleMemberSubcommand(interaction, adminName);
    } else if (subcommand === 'request') {
        return await handleRequestSubcommand(interaction, adminName);
    }
    throw new Error(`Subcommand ${subcommand} not found.`);
}
