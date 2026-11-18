import { z } from "zod";
import { discordSnowflakeSchema, typeDefinedConfig } from "./utils";
import { SYM_FIXER_DEFAULT } from "@lib/symbols";
import consts from "@shared/consts";


const mode = typeDefinedConfig({
    name: 'Allowlist Mode',
    default: 'disabled',
    validator: z.enum(['disabled', 'adminOnly', 'approvedLicense', 'discordMember', 'discordRoles', 'external']),
    fixer: SYM_FIXER_DEFAULT,
});

const rejectionMessage = typeDefinedConfig({
    name: 'Allowlist Instructions',
    default: 'Please join http://discord.gg/example and request to be allowlisted.',
    validator: z.string(),
    fixer: SYM_FIXER_DEFAULT,
});

export const polishDiscordRolesArray = (input: string[]) => {
    const unique = [...new Set(input)];
    unique.sort((a, b) => Number(a) - Number(b));
    return unique;
}

const discordRoles = typeDefinedConfig({
    name: 'Allowlisted Discord Roles',
    default: [],
    validator: discordSnowflakeSchema.array().transform(polishDiscordRolesArray),
    fixer: (input: any) => {
        if (!Array.isArray(input)) return [];
        const valid = input.filter(item => consts.regexDiscordSnowflake.test(item));
        return polishDiscordRolesArray(valid);
    },
});


export default {
    mode,
    rejectionMessage,
    discordRoles,
} as const;
