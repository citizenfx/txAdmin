const modulename = 'DiscordBot:cmd';
import orderedEmojis from 'unicode-emoji-json/data-ordered-emoji';
import { ColorResolvable, CommandInteraction, EmbedBuilder, InteractionReplyOptions } from "discord.js";
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);
const allEmojis = new Set(orderedEmojis);


/**
 * Generic embed generation functions
 */
const genericEmbed = (
    msg: string,
    ephemeral = false,
    color: ColorResolvable | null = null,
    emoji?: string
): InteractionReplyOptions => {
    return {
        ephemeral,
        embeds: [new EmbedBuilder({
            description: emoji ? `:${emoji}: ${msg}` : msg,
        }).setColor(color)],
    }
}

export const embedColors = {
    info: '#1D76C9',
    success: '#0BA70B',
    warning: '#FFF100',
    danger: '#A70B28',
} as const;

export const embedder = {
    generic: genericEmbed,
    info: (msg: string, ephemeral = false) => genericEmbed(msg, ephemeral, embedColors.info, 'information_source'),
    success: (msg: string, ephemeral = false) => genericEmbed(msg, ephemeral, embedColors.success, 'white_check_mark'),
    warning: (msg: string, ephemeral = false) => genericEmbed(msg, ephemeral, embedColors.warning, 'warning'),
    danger: (msg: string, ephemeral = false) => genericEmbed(msg, ephemeral, embedColors.danger, 'no_entry_sign'),
}


/**
 * Ensure that the discord interaction author has the required permission
 */
export const ensurePermission = async (interaction: CommandInteraction, reqPerm: string) => {
    const admin = txCore.adminStore.getAdminByProviderUID(interaction.user.id);
    if (!admin) {
        await interaction.reply(
            embedder.warning(`**Your account does not have txAdmin access.** :face_with_monocle:\nIf you are already registered in txAdmin, visit the Admin Manager page, and make sure the Discord ID for your user is set to \`${interaction.user.id}\`.`, true)
        );
        return false;
    }
    if (
        admin.master !== true
        && !admin.permissions.includes('all_permissions')
        && !admin.permissions.includes(reqPerm)
    ) {
        //@ts-ignore: not important
        const permName = txCore.adminStore.registeredPermissions[reqPerm] ?? 'Unknown';
        await interaction.reply(
            embedder.danger(`Your txAdmin account does not have the "${permName}" permissions required for this action.`, true)
        );
        return false;
    }

    return admin.name;
}


/**
 * Equivalent to ctx.admin.logAction()
 */
export const logDiscordAdminAction = async (adminName: string, message: string) => {
    txCore.logger.admin.write(adminName, message);
}


/**
 * Tests if an embed url is valid or not
 * 
 */
export const isValidEmbedUrl = (url: unknown) => {
    return typeof url === 'string' && /^(https?|discord):\/\//.test(url);
}


/**
 * Tests if an emoji STRING is valid or not.
 * Acceptable options:
 * - UTF-8 emoji ('😄')
 * - Valid emoji ID ('1062339910654246964')
 * - Discord custom emoji (`<:name:id>` or `<a:name:id>`)
 */
export const isValidButtonEmoji = (emoji: unknown) => {
    if (typeof emoji !== 'string') return false;
    if (/^\d{17,19}$/.test(emoji)) return true;
    if (/^<a?:\w{2,32}:\d{17,19}>$/.test(emoji)) return true;
    return allEmojis.has(emoji);
}


//Works
// console.dir(isValidEmoji('<:txicon:1062339910654246964>'))
// console.dir(isValidEmoji('1062339910654246964'))
// console.dir(isValidEmoji('😄'))
// console.dir(isValidEmoji('🇵🇼'))
// console.dir(isValidEmoji('\u{1F469}\u{200D}\u{2764}\u{FE0F}\u{200D}\u{1F48B}\u{200D}\u{1F469}'))

//Discord throws api error
// console.dir(isValidEmoji(':smile:'))
// console.dir(isValidEmoji('smile'))
// console.dir(isValidEmoji({name: 'smile'}))
