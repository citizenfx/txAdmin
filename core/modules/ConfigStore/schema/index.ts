import { z } from "zod";
import { ConfigScope, ListOf } from "./utils";
import general from "./general";
import server from "./server";
import restarter from "./restarter";
import banlist from "./banlist";
import whitelist from "./whitelist";
import discordBot from "./discordBot";
import gameFeatures from "./gameFeatures";
import webServer from "./webServer";
import logger from "./logger";
import { SYM_RESET_CONFIG } from "@lib/symbols";


//Type inference utils
type InferConfigScopes<S extends ConfigScope> = InferConfigValues<S>;
type InferConfigValues<S extends ConfigScope> = {
    [K in keyof S]: S[K]['default'] | z.infer<S[K]['validator']>;
}
type WritableValues<T> = {
    -readonly [P in keyof T]: T[P]
};
type InferConfigScopesToSave<S extends ConfigScope> = InferConfigValuesToSave<WritableValues<S>>;
type InferConfigValuesToSave<S extends ConfigScope> = WritableValues<{
    [K in keyof S]: S[K]['default'] | z.infer<S[K]['validator']> | typeof SYM_RESET_CONFIG;
}>;

//Exporting the schemas
export const ConfigSchemas_v2 = {
    general,
    server,
    restarter,
    banlist,
    whitelist,
    discordBot,
    gameFeatures,
    webServer,
    logger,
} satisfies ListOf<ConfigScope>;

//Exporting the types
export type TxConfigScopes = keyof typeof ConfigSchemas_v2;
export type TxConfigs = {
    [K in TxConfigScopes]: InferConfigScopes<typeof ConfigSchemas_v2[K]>
};
export type PartialTxConfigs = Partial<{
    [K in TxConfigScopes]: Partial<InferConfigScopes<typeof ConfigSchemas_v2[K]>>
}>;
export type PartialTxConfigsToSave = Partial<{
    [K in TxConfigScopes]: Partial<InferConfigScopesToSave<typeof ConfigSchemas_v2[K]>>
}>;
export type ConfigFileData = PartialTxConfigs & { version: number };

//Allow unknown scopes/keys
export type ConfigScaffold = ListOf<ListOf<any>>;
