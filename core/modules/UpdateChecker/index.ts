const modulename = 'UpdateChecker';
import { txEnv } from '@core/globalData';
import consoleFactory from '@lib/console';
import { UpdateDataType } from '@shared/otherTypes';
import { UpdateAvailableEventType } from '@shared/socketioTypes';
import { queryChangelogApi } from './queryChangelogApi';
import { queryGen9DepotApi } from './queryDepotApi';
import { getUpdateRolloutDelay } from './updateRollout';
const console = consoleFactory(modulename);


type CachedDelayType = {
    ts: number,
    diceRoll: number,
}

/**
 * Creates a cache string.
 */
const createCacheString = (delayData: CachedDelayType) => {
    return `${delayData.ts},${delayData.diceRoll}`;
}


/**
 * Parses the cached string.
 * Format: "ts,diceRoll"
 */
const parseCacheString = (raw: any) => {
    if (typeof raw !== 'string' || !raw) return;
    const [ts, diceRoll] = raw.split(',');
    const obj = {
        ts: parseInt(ts),
        diceRoll: parseInt(diceRoll),
    } satisfies CachedDelayType;
    if (isNaN(obj.ts) || isNaN(obj.diceRoll)) return;
    return obj;
}


/**
 * Rolls dice, gets integer between 0 and 100
 */
const rollDice = () => {
    return Math.floor(Math.random() * 101);
}

const DELAY_CACHE_KEY = 'updateDelay';


/**
 * Module to check for updates and notify the user according to a rollout strategy randomly picked.
 */
export default class UpdateChecker {
    txaUpdateData?: UpdateDataType;
    fxsUpdateData?: UpdateDataType;

    constructor() {
        //Check for updates ASAP
        setImmediate(() => {
            this.checkChangelog();
        });

        //Check again every 15 mins
        setInterval(() => {
            this.checkChangelog();
        }, 15 * 60_000);
    }


    /**
     * Check for txAdmin and FXServer updates
     */
    async checkChangelog() {
        //Gen9 uses the new Depot API (fxserver builds only, until it exposes txAdmin meta fields),
        //while gen8 still relies on the legacy changelog API until it also migrates to depot
        const updates = txEnv.fxsIsGen9
            ? await queryGen9DepotApi()
            : await queryChangelogApi();
        if (!updates) return;

        //If fxserver, don't print anything, just update the data
        if (updates.fxs) {
            this.fxsUpdateData = {
                version: updates.fxs.version,
                isImportant: updates.fxs.isImportant,
            }
        }

        //If txAdmin update, check for delay before printing
        if (updates.txa) {
            //Setup delay data
            const currTs = Date.now();
            let delayData: CachedDelayType;
            const rawCache = txCore.cacheStore.get(DELAY_CACHE_KEY);
            const cachedData = parseCacheString(rawCache);
            if (cachedData) {
                delayData = cachedData;
            } else {
                delayData = {
                    diceRoll: rollDice(),
                    ts: currTs,
                }
                txCore.cacheStore.set(DELAY_CACHE_KEY, createCacheString(delayData));
            }

            //Get the delay
            const notifDelayDays = getUpdateRolloutDelay(
                updates.txa.semverDiff,
                txEnv.txaVersion.includes('-'),
                delayData.diceRoll
            );
            const notifDelayMs = notifDelayDays * 24 * 60 * 60 * 1000;
            console.verbose.debug(`Update available, notification delayed by: ${notifDelayDays} day(s).`);
            if (currTs - delayData.ts >= notifDelayMs) {
                txCore.cacheStore.delete(DELAY_CACHE_KEY);
                this.txaUpdateData = {
                    version: updates.txa.version,
                    isImportant: updates.txa.isImportant,
                }
                if (updates.txa.isImportant) {
                    console.error('This version of txAdmin is outdated.');
                    console.error('Please update as soon as possible.');
                    console.error('For more information: https://txadmin.gg/discord');
                } else {
                    console.warn('This version of txAdmin is outdated.');
                    console.warn('A patch (bug fix) update is available for txAdmin.');
                    console.warn('If you are experiencing any kind of issue, please update now.');
                    console.warn('For more information: https://txadmin.gg/discord');
                }
            }
        }

        //Sending event to the UI
        if (this.txaUpdateData || this.fxsUpdateData) {
            txCore.webServer.webSocket.pushEvent<UpdateAvailableEventType>('updateAvailable', {
                fxserver: this.fxsUpdateData,
                txadmin: this.txaUpdateData,
            });
        }
    }
};

/*
    TODO:
    Create an page with the changelog, that queries for the following endpoint and caches it for 15 minutes:
        https://changelogs-live.fivem.net/api/changelog/versions/2385/2375?tag=server
    Maybe even grab the data from commits:
        https://changelogs-live.fivem.net/api/changelog/versions/5562
    Other relevant apis:
        https://changelogs-live.fivem.net/api/changelog/versions/win32/server? (the one being used below)
        https://changelogs-live.fivem.net/api/changelog/versions
        https://api.github.com/repos/citizenfx/txAdmin/releases (changelog in [].body)

    NOTE: old logic
    if == recommended, you're fine
    if > recommended && < optional, pls update to optional
    if == optional, you're fine
    if > optional && < latest, pls update to latest
    if == latest, duh
    if < critical, BIG WARNING
*/
