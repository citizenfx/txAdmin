import type { ReactAuthDataType } from "./authApiTypes";

//Config stuff
export type { TxConfigs, PartialTxConfigs } from "@core/modules/ConfigStore/schema";
export type { ConfigChangelogEntry } from "@core/modules/ConfigStore/changelog";
export type { GetConfigsResp } from "@core/routes/settings/getConfigs";
export type { SaveConfigsReq, SaveConfigsResp } from "@core/routes/settings/saveConfigs";
export type { BanTemplatesDataType, BanDurationType } from "@core/modules/ConfigStore/schema/banlist";
export type { ResetServerDataPathResp } from "@core/routes/settings/resetServerDataPath";
export type { GetBanTemplatesSuccessResp } from "@core/routes/banTemplates/getBanTemplates";
export type { SaveBanTemplatesResp, SaveBanTemplatesReq } from "@core/routes/banTemplates/saveBanTemplates";

//Stats stuff
export type { SvRtLogFilteredType, SvRtPerfCountsThreadType } from "@core/modules/Metrics/svRuntime/perfSchemas";
export type { SvRtPerfThreadNamesType } from "@core/modules/Metrics/svRuntime/config";
export type { PerfChartApiResp, PerfChartApiSuccessResp } from "@core/routes/perfChart";
export type { PlayerDropsApiResp, PlayerDropsApiSuccessResp, PlayerDropsDetailedWindow, PlayerDropsSummaryHour } from "@core/routes/playerDrops";
export type { PDLChangeEventType } from '@core/modules/Metrics/playerDrop/playerDropSchemas';

//Other stuff
export type { ApiAddLegacyBanReqSchema, ApiRevokeActionReqSchema } from "@core/routes/history/actions";

export type UpdateDataType = {
    version: string;
    isImportant: boolean;
} | undefined;

export type ThemeType = {
    name: string;
    isDark: boolean;
    style: { [key: string]: string };
};


export type InjectedTxConsts = {
    //Env
    fxsVersion: string;
    fxsOutdated: UpdateDataType,
    txaVersion: string;
    txaOutdated: UpdateDataType,

    serverTimezone: string;
    isWindows: boolean;
    isWebInterface: boolean;
    showAdvanced: boolean;
    hasMasterAccount: boolean;
    defaultTheme: string;
    customThemes: Omit<ThemeType, 'style'>[];
    providerLogo: string | undefined;
    providerName: string | undefined;
    hostConfigSource: string;
    server: {
        name: string;
        game: string | undefined;
        icon: string | undefined;
    };

    //Auth
    preAuth: ReactAuthDataType | false;
}


//Maybe extract to some shared folder
export type PlayerIdsObjectType = {
    discord: string | null;
    fivem: string | null;
    license: string | null;
    license2: string | null;
    live: string | null;
    steam: string | null;
    xbl: string | null;
};
