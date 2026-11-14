const modulename = 'FxScheduler';
import path from 'node:path';
import fsp from 'node:fs/promises';
import { parseSchedule } from '@lib/misc';
import consoleFactory from '@lib/console';
import { SYM_SYSTEM_AUTHOR } from '@lib/symbols';
import type { UpdateConfigKeySet } from './ConfigStore/utils';
const console = consoleFactory(modulename);


//Consts
const UPDATE_FILE_REASON_MAX_LENGTH = 150;


//Types
type RestartInfo = {
    string: string;
    minuteFloorTs: number;
    reason?: string;
}
type ParsedTime = {
    string: string;
    hours: number;
    minutes: number;
}


//Consts
const scheduleWarnings = [30, 15, 10, 5, 4, 3, 2, 1];


/**
 * Processes an array of HH:MM, gets the next timestamp (sorted by closest).
 * When time matches, it will be dist: 0, distMins: 0, and nextTs likely in the 
 * past due to seconds and milliseconds being 0.
 */
const getNextScheduled = (parsedSchedule: ParsedTime[]): RestartInfo => {
    const thisMinuteTs = new Date().setSeconds(0, 0);
    const processed = parsedSchedule.map((t) => {
        const nextDate = new Date();
        let minuteFloorTs = nextDate.setHours(t.hours, t.minutes, 0, 0);
        if (minuteFloorTs < thisMinuteTs) {
            minuteFloorTs = nextDate.setHours(t.hours + 24, t.minutes, 0, 0);
        }
        return {
            string: t.string,
            minuteFloorTs,
        };
    });
    return processed.sort((a, b) => a.minuteFloorTs - b.minuteFloorTs)[0];
};


/**
 * Module responsible for restarting the FXServer on a schedule defined in the config,
 * or a temporary schedule set by the user at runtime.
 */
export default class FxScheduler {
    static readonly configKeysWatched = ['restarter.schedule'];
    private nextTempSchedule: RestartInfo | false = false;
    private calculatedNextRestartMinuteFloorTs: number | false = false;
    private nextSkip: number | false = false;
    private isCheckingUpdateFile = false;

    constructor() {
        //Initial check to update status
        setImmediate(() => {
            this.checkSchedule();
        });

        //Cron Function
        setInterval(() => {
            this.checkSchedule();
            this.checkUpdateFile();
            txCore.webServer.webSocket.pushRefresh('status');
        }, 60 * 1000);
    }


    /**
     * Refresh configs, resets skip and temp scheduled, runs checkSchedule.
     */
    handleConfigUpdate(updatedConfigs: UpdateConfigKeySet) {
        this.nextSkip = false;
        this.nextTempSchedule = false;
        this.checkSchedule();
        txCore.webServer.webSocket.pushRefresh('status');
    }


    /**
     * Updates state when server closes.
     * Clear temp skips and skips next scheduled if it's in less than 2 hours.
     */
    handleServerClose() {
        //Clear temp schedule, recalculates next restart
        if (this.nextTempSchedule) this.nextTempSchedule = false;
        this.checkSchedule(true);
        
        //Check if next scheduled restart is in less than 2 hours
        const inTwoHours = Date.now() + 2 * 60 * 60 * 1000;
        if (
            this.calculatedNextRestartMinuteFloorTs 
            && this.calculatedNextRestartMinuteFloorTs < inTwoHours
            && this.nextSkip !== this.calculatedNextRestartMinuteFloorTs
        ) {
            console.warn('Server closed, skipping next scheduled restart because it\'s in less than 2 hours.');
            this.nextSkip = this.calculatedNextRestartMinuteFloorTs;
        }
        this.checkSchedule(true);

        //Push UI update
        txCore.webServer.webSocket.pushRefresh('status');
    }


    /**
     * Returns the current status of scheduler
     * NOTE: sending relative because server might have clock skew
     */
    getStatus() {
        if (this.calculatedNextRestartMinuteFloorTs) {
            const thisMinuteTs = new Date().setSeconds(0, 0);
            return {
                nextRelativeMs: this.calculatedNextRestartMinuteFloorTs - thisMinuteTs,
                nextSkip: this.nextSkip === this.calculatedNextRestartMinuteFloorTs,
                nextIsTemp: !!this.nextTempSchedule,
            };
        } else {
            return {
                nextRelativeMs: false,
                nextSkip: false,
                nextIsTemp: false,
            } as const;
        }
    }


    /**
     * Sets this.nextSkip.
     * Cancel scheduled button -> setNextSkip(true)
     * Enable scheduled button -> setNextSkip(false)
     */
    setNextSkip(enabled: boolean, author?: string) {
        if (enabled) {
            let prevMinuteFloorTs, temporary;
            if (this.nextTempSchedule) {
                prevMinuteFloorTs = this.nextTempSchedule.minuteFloorTs;
                temporary = true;
                this.nextTempSchedule = false;
            } else if (this.calculatedNextRestartMinuteFloorTs) {
                prevMinuteFloorTs = this.calculatedNextRestartMinuteFloorTs;
                temporary = false;
                this.nextSkip = this.calculatedNextRestartMinuteFloorTs;
            }

            if (prevMinuteFloorTs) {
                //Dispatch `txAdmin:events:scheduledRestartSkipped`
                txCore.fxRunner.sendEvent('scheduledRestartSkipped', {
                    secondsRemaining: Math.floor((prevMinuteFloorTs - Date.now()) / 1000),
                    temporary,
                    author,
                });

                //FIXME: deprecate
                txCore.fxRunner.sendEvent('skippedNextScheduledRestart', {
                    secondsRemaining: Math.floor((prevMinuteFloorTs - Date.now()) / 1000),
                    temporary
                });
            }
        } else {
            this.nextSkip = false;
        }

        //This is needed to refresh this.calculatedNextRestartMinuteFloorTs
        this.checkSchedule();

        //Refresh UI
        txCore.webServer.webSocket.pushRefresh('status');
    }


    /**
     * Sets this.nextTempSchedule.
     * The value MUST be before the next setting scheduled time.
     * An optional reason can be provided to be shown in the logs and restart message.
     */
    setNextTempSchedule(timeString: string, reason?: string) {
        //Process input
        if (typeof timeString !== 'string') throw new Error('expected string');
        const thisMinuteTs = new Date().setSeconds(0, 0);
        let scheduledString, scheduledMinuteFloorTs;

        if (timeString.startsWith('+')) {
            const minutes = parseInt(timeString.slice(1));
            if (isNaN(minutes) || minutes < 1 || minutes >= 1440) {
                throw new Error('invalid minutes');
            }
            const nextDate = new Date(thisMinuteTs + (minutes * 60 * 1000));
            scheduledMinuteFloorTs = nextDate.getTime();
            scheduledString = nextDate.getHours().toString().padStart(2, '0') + ':' + nextDate.getMinutes().toString().padStart(2, '0');
        } else {
            const [hours, minutes] = timeString.split(':', 2).map((x) => parseInt(x));
            if (typeof hours === 'undefined' || isNaN(hours) || hours < 0 || hours > 23) throw new Error('invalid hours');
            if (typeof minutes === 'undefined' || isNaN(minutes) || minutes < 0 || minutes > 59) throw new Error('invalid minutes');

            const nextDate = new Date();
            scheduledMinuteFloorTs = nextDate.setHours(hours, minutes, 0, 0);
            if (scheduledMinuteFloorTs === thisMinuteTs) {
                throw new Error('Due to the 1 minute precision of the restart scheduler, you cannot schedule a restart in the same minute.');
            }
            if (scheduledMinuteFloorTs < thisMinuteTs) {
                scheduledMinuteFloorTs = nextDate.setHours(hours + 24, minutes, 0, 0);
            }
            scheduledString = hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0');
        }

        //Check validity
        if (Array.isArray(txConfig.restarter.schedule) && txConfig.restarter.schedule.length) {
            const { valid } = parseSchedule(txConfig.restarter.schedule);
            const nextSettingRestart = getNextScheduled(valid);
            if (nextSettingRestart.minuteFloorTs < scheduledMinuteFloorTs) {
                throw new Error(`You already have one restart scheduled for ${nextSettingRestart.string}, which is before the time you specified.`);
            }
        }

        // Set next temp schedule
        this.nextTempSchedule = {
            string: scheduledString,
            minuteFloorTs: scheduledMinuteFloorTs,
            reason: typeof reason === 'string' && reason.length ? reason : undefined,
        };

        //This is needed to refresh this.calculatedNextRestartMinuteFloorTs
        this.checkSchedule();

        //Refresh UI
        txCore.webServer.webSocket.pushRefresh('status');
    }


    /**
     * Checks the server data folder for an "update file" (eg. `.update`) and, if found,
     * deletes it and schedules a temporary restart.
     * This is meant to help servers that use CI/CD pipelines to deploy updates: the pipeline
     * just needs to drop the configured file in the server data folder.
     * The file content (if any) is used as the restart reason/message.
     */
    async checkUpdateFile() {
        //Check if feature is enabled and not already running
        if (!txConfig.restarter.updateFileEnabled) return;
        if (this.isCheckingUpdateFile) return;

        //Only act when the server is actually running, otherwise leave the file
        //to be picked up once the server is up (and a restart makes sense)
        if (txCore.fxRunner.isIdle || !txCore.fxRunner.child?.isAlive) return;

        //Resolve the file path (basename to prevent path traversal via config)
        const dataPath = txCore.fxRunner.serverPaths?.dataPath;
        if (!dataPath) return;
        const updateFilePath = path.join(dataPath, path.basename(txConfig.restarter.updateFileName));

        this.isCheckingUpdateFile = true;
        try {
            //Check if the file exists and is a file
            const fileStat = await fsp.stat(updateFilePath).catch(() => null);
            if (!fileStat?.isFile()) return;

            //Read the content to use as restart reason (before deleting)
            let reason: string | undefined;
            try {
                const raw = await fsp.readFile(updateFilePath, 'utf8');
                const sanitized = raw.replace(/\s+/g, ' ').trim().slice(0, UPDATE_FILE_REASON_MAX_LENGTH);
                if (sanitized.length) reason = sanitized;
            } catch (error) {
                console.verbose.warn(`Failed to read update file content: ${(error as Error).message}`);
            }

            //Delete the file first so we never loop on it, even if scheduling fails
            await fsp.unlink(updateFilePath);
            const logReason = reason ? ` (${reason})` : '';
            txCore.logger.admin.write('SCHEDULER', `Update file detected${logReason}, scheduling a restart.`);

            //Don't override an already pending temp restart
            if (this.nextTempSchedule) {
                console.verbose.log('A temporary restart is already scheduled, skipping the update file restart.');
                return;
            }

            //Schedule the restart
            try {
                this.setNextTempSchedule(`+${txConfig.restarter.updateFileDelay}`, reason);
            } catch (error) {
                console.warn(`Update file detected but couldn't schedule a restart: ${(error as Error).message}`);
            }
        } catch (error) {
            console.error(`Error while checking the update file: ${(error as Error).message}`);
        } finally {
            this.isCheckingUpdateFile = false;
        }
    }


    /**
     * Checks the schedule to see if it's time to announce or restart the server
     */
    async checkSchedule(calculateOnly = false) {
        //Check settings and temp scheduled restart
        let nextRestart: RestartInfo;
        if (this.nextTempSchedule) {
            nextRestart = this.nextTempSchedule;
        } else if (Array.isArray(txConfig.restarter.schedule) && txConfig.restarter.schedule.length) {
            const { valid } = parseSchedule(txConfig.restarter.schedule);
            nextRestart = getNextScheduled(valid);
        } else {
            //nothing scheduled
            this.calculatedNextRestartMinuteFloorTs = false;
            return;
        }
        this.calculatedNextRestartMinuteFloorTs = nextRestart.minuteFloorTs;
        if (calculateOnly) return;

        //Checking if skipped
        if (this.nextSkip === this.calculatedNextRestartMinuteFloorTs) {
            console.verbose.log(`Skipping next scheduled restart`);
            return;
        }

        //Calculating dist
        const thisMinuteTs = new Date().setSeconds(0, 0);
        const nextDistMs = nextRestart.minuteFloorTs - thisMinuteTs;
        const nextDistMins = Math.floor(nextDistMs / 60_000);

        //Checking if server restart or warning time
        if (nextDistMins === 0) {
            //restart server
            this.triggerServerRestart(
                nextRestart.reason
                    ? `update file restart (${nextRestart.reason})`
                    : `scheduled restart at ${nextRestart.string}`,
                nextRestart.reason ?? txCore.translator.t('restarter.schedule_reason', { time: nextRestart.string }),
            );

            //Check if server is in boot cooldown
            const processUptime = Math.floor((txCore.fxRunner.child?.uptime ?? 0) / 1000);
            if (processUptime < txConfig.restarter.bootGracePeriod) {
                console.verbose.log(`Server is in boot cooldown, skipping scheduled restart.`);
                return;
            }

            //reset next scheduled
            this.nextTempSchedule = false;

        } else if (scheduleWarnings.includes(nextDistMins)) {
            const tOptions = {
                smart_count: nextDistMins,
                servername: txConfig.general.serverName,
            };

            //Send discord warning
            txCore.discordBot.sendAnnouncement({
                type: 'warning',
                description: {
                    key: 'restarter.schedule_warn_discord',
                    data: tOptions
                }
            });

            //Dispatch `txAdmin:events:scheduledRestart`
            let translatedMessage = txCore.translator.t('restarter.schedule_warn', tOptions);
            if (nextRestart.reason) translatedMessage += ` (${nextRestart.reason})`;
            txCore.fxRunner.sendEvent('scheduledRestart', {
                secondsRemaining: nextDistMins * 60,
                translatedMessage,
            });
        }
    }


    /**
     * Triggers FXServer restart and logs the reason.
     */
    async triggerServerRestart(reasonInternal: string, reasonTranslated: string) {
        //Sanity check
        if (txCore.fxRunner.isIdle || !txCore.fxRunner.child?.isAlive) {
            console.verbose.warn('Server not running, skipping scheduled restart.');
            return false;
        }

        //Restart server
        const logMessage = `Restarting server: ${reasonInternal}`;
        txCore.logger.admin.write('SCHEDULER', logMessage);
        txCore.logger.fxserver.logInformational(logMessage); //just for better visibility
        txCore.fxRunner.restartServer(reasonTranslated, SYM_SYSTEM_AUTHOR);
    }
};
