const modulename = 'WebServer:DiagnosticsFuncs';
import os from 'node:os';
import getOsDistro from '@lib/host/getOsDistro.js';
import getHostUsage from '@lib/host/getHostUsage';
import pidUsageTree from '@lib/host/pidUsageTree.js';
import { txEnv, txHostConfig } from '@core/globalData';
import si from 'systeminformation';
import consoleFactory from '@lib/console';
import { getHeapStatistics } from 'node:v8';
import bytes from 'bytes';
import { msToShortishDuration } from './misc';
import type { ProcessInfo } from '@shared/diagnosticsTypes';
const console = consoleFactory(modulename);


//Helpers
const MEGABYTE = 1024 * 1024;
type HostStaticDataType = {
    nodeVersion: string,
    username: string,
    osDistro: string,
    cpu: {
        manufacturer: string;
        brand: string;
        speedMin: number;
        speedMax: number;
        physicalCores: number;
        cores: number;
    },
};
type HostDynamicDataType = {
    cpuUsage: number;
    memory: {
        usage: number;
        used: number;
        total: number;
    },
};
type HostDataReturnType = {
    static: HostStaticDataType,
    dynamic?: HostDynamicDataType
} | { error: string };
let _hostStaticDataCache: HostStaticDataType;


/**
 * Gets the Processes Data.
 * FIXME: migrate to use gwmi on windows by default
 */
export const getProcessesData = async () => {
    const procList: ProcessInfo[] = [];
    try {
        const txProcessId = process.pid;
        const processes = await pidUsageTree(txProcessId);

        for (const [pid, proc] of Object.entries(processes)) {
            //NOTE: Cleaning invalid proccesses that might show up in Linux
            if (!pid || !proc) continue;
            const currPidInt = parseInt(pid);

            let procName;
            if (currPidInt === txProcessId) {
                procName = 'txAdmin';
            } else if (proc.memory <= 10 * MEGABYTE) {
                procName = 'MiniDump';
            } else {
                procName = 'FXServer';
            }

            procList.push({
                pid: currPidInt,
                parent: proc.ppid,
                name: procName,
                cpu: proc.cpu,
                memory: proc.memory / MEGABYTE,
            });
        }
    } catch (error) {
        if ((error as any).code = 'ENOENT') {
            console.error('Failed to get processes tree usage data.');
            if (txEnv.isWindows) {
                console.error('This is probably because the `wmic` command is not available in your system.');
                console.error('If you are on Windows 11 or Windows Server 2025, you can enable it in the "Windows Features" settings.');
            } else {
                console.error('This is probably because the `ps` command is not available in your system.');
                console.error('This command is part of the `procps` package in most Linux distributions.');
            }
        } else {
            console.error('Error getting processes tree usage data.');
            console.verbose.dir(error);
        }
    }

    return procList;
}


/**
 * Gets the Host Data.
 */
export const getHostData = async (): Promise<HostDataReturnType> => {
    //Get and cache static information
    if (!_hostStaticDataCache) {
        //This errors out on pterodactyl egg
        let osUsername = 'unknown';
        try {
            const userInfo = os.userInfo();
            osUsername = userInfo.username;
        } catch (error) { }

        try {
            const cpuStats = await si.cpu();
            _hostStaticDataCache = {
                nodeVersion: process.version,
                username: osUsername,
                osDistro: await getOsDistro(),
                cpu: {
                    manufacturer: cpuStats.manufacturer,
                    brand: cpuStats.brand,
                    speedMin: cpuStats.speedMin ?? cpuStats.speed,
                    speedMax: cpuStats.speedMax,
                    physicalCores: cpuStats.physicalCores,
                    cores: cpuStats.cores,
                }
            }
        } catch (error) {
            console.error('Error getting Host static data.');
            console.verbose.dir(error);
            return { error: 'Failed to retrieve host static data. Check the terminal for more information (if verbosity is enabled).' };
        }
    }

    //Get dynamic info (mem/cpu usage) and prepare output
    try {
        const stats = await Promise.race([
            getHostUsage(),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500))
        ]);
        if (stats) {
            return {
                static: _hostStaticDataCache,
                dynamic: {
                    cpuUsage: stats.cpu.usage,
                    memory: {
                        usage: stats.memory.usage,
                        used: stats.memory.used,
                        total: stats.memory.total,
                    }
                }
            };
        } else {
            return {
                static: _hostStaticDataCache,
            };
        }
    } catch (error) {
        console.error('Error getting Host dynamic data.');
        console.verbose.dir(error);
        return { error: 'Failed to retrieve host dynamic data. Check the terminal for more information (if verbosity is enabled).' };
    }
}


/**
 * Gets the Host Static Data from cache.
 */
export const getHostStaticData = (): HostStaticDataType => {
    if (!_hostStaticDataCache) {
        throw new Error(`hostStaticDataCache not yet ready`);
    }
    return _hostStaticDataCache;
}


/**
 * Gets txAdmin Data
 */
export const getRuntimeData = async () => {
    const stats = txCore.metrics.txRuntime; //shortcut
    const memoryUsage = getHeapStatistics();

    let hostApiTokenState = 'not configured';
    if (txHostConfig.hostApiToken === 'disabled') {
        hostApiTokenState = 'disabled';
    } else if (txHostConfig.hostApiToken) {
        hostApiTokenState = 'configured';
    }

    let runtime = 'Unknown runtime';
    if ('Bun' in globalThis) {
        //@ts-ignore bun types not installed, just futureproofing
        runtime = `Bun v${Bun.version}`;
    } else if ('node' in process.versions && process.versions.node) {
        runtime = `Node.js v${process.versions.node}`;
    }

    const defaultFlags = Object.entries(txHostConfig.defaults).filter(([k, v]) => Boolean(v)).map(([k, v]) => k);
    return {
        txEnv,
        runtime,
        uptime: msToShortishDuration(process.uptime() * 1000),
        databaseFileSize: bytes(txCore.database.fileSize),
        txHostConfig: {
            ...txHostConfig,
            dataSubPath: undefined,
            hostApiToken: hostApiTokenState,
            defaults: defaultFlags,
        },
        monitor: {
            hbFails: stats.monitorStats.healthIssues,
            restarts: stats.monitorStats.restartReasons,
        },
        performance: {
            banCheck: stats.banCheckTime,
            whitelistCheck: stats.whitelistCheckTime,
            playersTableSearch: stats.playersTableSearchTime,
            historyTableSearch: stats.historyTableSearchTime,
            databaseSave: stats.databaseSaveTime,
            perfCollection: stats.perfCollectionTime,
        },
        logger: {
            storageSize: await txCore.logger.getStorageSize(),
            statusAdmin: txCore.logger.admin.getUsageStats(),
            statusFXServer: txCore.logger.fxserver.getUsageStats(),
            statusServer: txCore.logger.server.getUsageStats(),
        },
        memoryUsage: {
            heap_used: bytes(memoryUsage.used_heap_size) ?? '--',
            heap_limit: bytes(memoryUsage.heap_size_limit) ?? '--',
            heap_pct: (memoryUsage.heap_size_limit > 0)
                ? (memoryUsage.used_heap_size / memoryUsage.heap_size_limit * 100).toFixed(2)
                : 0,
            physical: bytes(memoryUsage.total_physical_size) ?? '--',
            peak_malloced: bytes(memoryUsage.peak_malloced_memory) ?? '--',
        },
    };
}
