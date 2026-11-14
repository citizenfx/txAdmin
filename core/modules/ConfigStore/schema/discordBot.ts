import { z } from "zod";
import { discordSnowflakeSchema, typeDefinedConfig, typeNullableConfig } from "./utils";
import { defaultEmbedConfigJson, defaultEmbedJson } from "@modules/DiscordBot/defaultJsons";
import { SYM_FIXER_DEFAULT } from "@lib/symbols";


const enabled = typeDefinedConfig({
    name: 'Bot Enabled',
    default: false,
    validator: z.boolean(),
    fixer: SYM_FIXER_DEFAULT,
});

const token = typeNullableConfig({
    name: 'Bot Token',
    default: null,
    validator: z.string().min(1).nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const guild = typeNullableConfig({
    name: 'Server ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const punishmentsChannel = typeNullableConfig({
    name: 'Punishments Channel ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});

const announcementsChannel = typeNullableConfig({
    name: 'Announcements Channel ID',
    default: null,
    validator: discordSnowflakeSchema.nullable(),
    fixer: SYM_FIXER_DEFAULT,
});


//We are not validating the JSON, only that it is a string
export const attemptMinifyJsonString = (input: string) => {
    try {
        return JSON.stringify(JSON.parse(input));
    } catch (error) {
        return input;
    }
};

const embedJson = typeDefinedConfig({
    name: 'Status Embed JSON',
    default: defaultEmbedJson,
    validator: z.string().min(1).transform(attemptMinifyJsonString),
    //NOTE: no true valiation in here, done in the module only
    fixer: SYM_FIXER_DEFAULT,
});

const embedConfigJson = typeDefinedConfig({
    name: 'Status Config JSON',
    default: defaultEmbedConfigJson,
    validator: z.string().min(1).transform(attemptMinifyJsonString),
    //NOTE: no true valiation in here, done in the module only
    fixer: SYM_FIXER_DEFAULT,
});


export default {
    enabled,
    token,
    guild,
    punishmentsChannel,
    announcementsChannel,
    embedJson,
    embedConfigJson,
} as const;
