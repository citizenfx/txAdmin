import { dequal } from 'dequal/lite';
import { GetConfigsResp, PartialTxConfigs, TxConfigs } from "@shared/otherTypes";


/**
 * Types
 */
export type SettingsTabInfo = {
    tabId: string; //eg. game
    tabName: string; //eg. Game
}
export type SettingsCardInfo = {
    cardId: string; //eg. game-menu
    cardName: string; //eg. Menu
    cardTitle: string; //eg. Game Menu
}

export type SettingsCardContext = SettingsTabInfo & SettingsCardInfo;

export type SettingsPageContext = {
    apiData?: GetConfigsResp;
    isReadOnly: boolean;
    isLoading: boolean;
    isSaving: boolean;
    swrError: string | undefined;
    cardPendingSave: SettingsCardContext | null;
    setCardPendingSave: (state: SettingsCardContext | null) => void;
    saveChanges: (card: SettingsCardContext, changes: PartialTxConfigs) => Promise<void>;
}

export type SettingsCardProps = {
    cardCtx: SettingsCardContext;
    pageCtx: SettingsPageContext;
};

type PageConfig = {
    scope: string;
    key: string;
    isAdvanced?: boolean;
    type: any;
}

type PageConfigs = Record<string, PageConfig>;

type InferConfigTypes<T extends PageConfigs> = {
    [K in keyof T]: T[K]['type'];
}

/**
 * Symbol representing the reset config action
 */
export const SYM_RESET_CONFIG = Symbol('Settings:ResetConfig');


/**
 * Helper to get the inferred type of a config object.
 * TODO: when the UI gets the default values built-in, return them here
 */
export const getPageConfig = <
    S extends keyof TxConfigs,
    T extends TxConfigs[S][K],
    K extends keyof TxConfigs[S] extends string ? keyof TxConfigs[S] : never,
>(scope: S, key: K, showAdvancedState: boolean | undefined = undefined) => {
    return {
        scope,
        key,
        isAdvanced: showAdvancedState,
        // defaultValue: T,
    } as {
        scope: S,
        key: K,
        isAdvanced: boolean;
        type: T;
    };
}


/**
 * Reducer to replace a single config value in the state
 */
export const configsReducer = <
    T extends PageConfigs
>(
    state: InferConfigTypes<T>,
    action: PageConfigReducerAction
) => {
    const newValue = typeof action.configValue === 'function'
        ? action.configValue(state[action.configName])
        : action.configValue;
    return { ...state, [action.configName]: newValue };
};

export type PageConfigReducerActionValue<T=any> = (T | undefined) | ((prevValue: (T | undefined)) => (T | undefined));
export type PageConfigReducerAction<T=any> = { 
    configName: string, 
    configValue: PageConfigReducerActionValue<T>
};


/**
 * Helper to get an object with all the config keys set to undefined
 */
export const getConfigEmptyState = <T extends PageConfigs>(pageConfigs: T) => {
    return Object.fromEntries(
        Object.keys(pageConfigs).map(k => [k, undefined])
    ) as InferConfigTypes<typeof pageConfigs>;
};


/**
 * Helper function to get an object with the config properties and setters
 */
const getConfigAccessor = <T = any>(
    cardId: string,
    configName: string,
    configData: PageConfig,
    apiData: GetConfigsResp | undefined,
    dispatch: React.Dispatch<PageConfigReducerAction>,
) => {
    const getApiValues = () => {
        //@ts-ignore couldn't figure out how to make this work
        const storedValue = apiData?.storedConfigs?.[configData.scope]?.[configData.key] as T | undefined;
        //@ts-ignore couldn't figure out how to make this work
        const defaultValue = apiData?.defaultConfigs?.[configData.scope]?.[configData.key] as T | undefined;
        const initialValue = storedValue !== undefined && storedValue !== null
            ? storedValue
            : defaultValue;
        return {
            storedValue,
            defaultValue,
            initialValue: initialValue as Exclude<T, null> | undefined,
        };
    }

    //Setting initial data
    const apiDataValues = getApiValues();
    if (apiData) {
        dispatch({ configName, configValue: apiDataValues.initialValue });
    }
    return {
        scope: configData.scope,
        key: configData.key,
        isAdvanced: configData.isAdvanced ?? false,
        eid: `tab-${cardId}:config:${configData.key}`,
        defaultValue: apiDataValues.defaultValue,
        initialValue: apiDataValues.initialValue,
        state: {
            set: (configValue: PageConfigReducerActionValue<T>) => dispatch({ configName, configValue }),
            discard: () => dispatch({ configName, configValue: getApiValues().initialValue }),
            default: () => dispatch({ configName, configValue: getApiValues().defaultValue }),
        },
        hasChanged: (currVal: unknown) => {
            return apiData !== undefined
                && !dequal(currVal, getApiValues().initialValue);
        },
    } satisfies ConfigValueAccessor;
};

type ConfigValueAccessor = {
    scope: string;
    key: string;
    isAdvanced: boolean;
    eid: string;
    defaultValue: any;
    initialValue: any;
    state: {
        set: (value: any) => void;
        discard: () => void;
        default: () => void;
    },
    hasChanged: (currVal: unknown) => boolean;
};


/**
 * Helper function to get an object with all the config accessors
 */
export const getConfigAccessors = <
    T extends PageConfigs
>(
    cardId: string,
    pageConfigs: T,
    apiData: GetConfigsResp | undefined,
    dispatch: React.Dispatch<PageConfigReducerAction>,
) => {
    return Object.fromEntries(
        Object.entries(pageConfigs).map(([configName, configData]) => ([
            configName,
            getConfigAccessor(cardId, configName, configData, apiData, dispatch),
        ]))
    ) as { [K in keyof T]: ReturnType<typeof getConfigAccessor<T[K]['type']>> };
};


/**
 * Helper function to diff the current value against the stored value and return a PartialTxConfigs object
 */
export const getConfigDiff = (
    configs: Record<string, ConfigValueAccessor>,
    states: Record<string, any>,
    overwrites: Record<string, any>,
    includeAdvanced: boolean,
) => {
    const localConfigs: any = {};
    const changedConfigs: any = {};
    let hasChanges = false;
    console.groupCollapsed('Settings Diffing:');
    for (const [configName, config] of Object.entries(configs)) {
        if (config.isAdvanced && !includeAdvanced) continue; //config is hidden
        let newVal = configName in overwrites  //overwrites take precedence - even undefined!
            ? overwrites[configName]
            : states[configName];
        if(newVal === undefined) {
            newVal = SYM_RESET_CONFIG; //NOTE: this is to make sure undefined is not treated as null
        }
        if (typeof newVal === 'string') newVal = newVal.trim();
        localConfigs[config.scope] ??= {};
        localConfigs[config.scope][config.key] = newVal;

        const hasChanged = config.hasChanged(newVal);
        console.log(
            hasChanged,
            config.scope,
            config.key,
            {
                initial: config.initialValue,
                current: newVal
            }
        );
        if (hasChanged) {
            hasChanges = true;
            changedConfigs[config.scope] ??= {};
            changedConfigs[config.scope][config.key] = newVal;
        }
    }
    console.log('Final changedConfigs:', changedConfigs);
    console.groupEnd();

    return {
        hasChanges,
        localConfigs: localConfigs as PartialTxConfigs,
        changedConfigs: changedConfigs as PartialTxConfigs, //NOTE: not being used
    };
}
