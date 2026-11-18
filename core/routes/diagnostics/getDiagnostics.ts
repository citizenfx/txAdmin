const modulename = 'WebServer:Diagnostics';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import MemCache from '@lib/MemCache';
import * as diagnosticsFuncs from '@lib/diagnostics';
import consoleFactory from '@lib/console';
import type { DiagnosticsPageData } from '@shared/diagnosticsTypes';
import type { GenericApiErrorResp } from '@shared/genericApiTypes';
import type { QuantileArray } from '@modules/Metrics/statsUtils';
const console = consoleFactory(modulename);
const cache = new MemCache<DiagnosticsPageData>(5);


//Helpers
const perfQuantiles = (perfData: QuantileArray) => {
    const result = perfData.result(true);
    if (!result.enoughData) return 'not enough data available';
    return {
        p5: `${result.p5}ms`,
        p25: `${result.p25}ms`,
        p50: `${result.p50}ms`,
        p75: `${result.p75}ms`,
        p95: `${result.p95}ms`,
        n: result.count,
    }
}


/**
 * Returns the diagnostics data
 */
export default async function GetDiagnosticsData(ctx: AuthedCtx) {
    const sendTypedResp = (data: DiagnosticsPageData | GenericApiErrorResp) => ctx.send(data);

    const cachedData = cache.get();
    if (cachedData) return sendTypedResp(cachedData);

    //Prepare data
    const timeStart = Date.now();
    const [runtimeData, databaseStats, hostData, processesData] = await Promise.all([
        diagnosticsFuncs.getRuntimeData(),
        txCore.database.stats.getDatabaseStats(), //not really a promise, but can throw
        diagnosticsFuncs.getHostData(),
        diagnosticsFuncs.getProcessesData(),
    ]);
    const data: DiagnosticsPageData = {
        runtime: {},
        host: {},
        server: {},
        processes: [],
        loadTime: Date.now() - timeStart,
    };

    //Runtime data
    data.runtime = {
        'Overview': {
            'Uptime': runtimeData.uptime,
            'Runtime': runtimeData.runtime,
            'Versions': {
                tx: runtimeData.txEnv.txaVersion,
                fx: runtimeData.txEnv.fxsVersionTag,
            },
            'Database': {
                file: runtimeData.databaseFileSize ?? '--',
                players: databaseStats.players,
                bans: databaseStats.bans,
                warns: databaseStats.warns,
            },
        },
        'Env Config': {
            'FXServer': runtimeData.txEnv.fxsPath,
            'Profile': runtimeData.txEnv.profilePath,
            'Defaults': runtimeData.txHostConfig.defaults.length > 0
                ? runtimeData.txHostConfig.defaults.join(', ')
                : '--',
            'Interface': runtimeData.txHostConfig.netInterface ?? '--',
            'Provider': runtimeData.txHostConfig.providerName ?? '--',
        },
        'Performance': {
            'BanCheck': perfQuantiles(runtimeData.performance.banCheck),
            'WhitelistCheck': perfQuantiles(runtimeData.performance.whitelistCheck),
            'PlayersTable': perfQuantiles(runtimeData.performance.playersTableSearch),
            'HistoryTable': perfQuantiles(runtimeData.performance.historyTableSearch),
            'DatabaseSave': perfQuantiles(runtimeData.performance.databaseSave),
            'PerfCollection': perfQuantiles(runtimeData.performance.perfCollection),
        },
        'Monitor': {
            'HB Fails': {
                HTTP: runtimeData.monitor.hbFails.http,
                FD3: runtimeData.monitor.hbFails.fd3,
            },
            'Restarts': {
                BT: runtimeData.monitor.restarts.bootTimeout,
                CL: runtimeData.monitor.restarts.close,
                HB: runtimeData.monitor.restarts.heartBeat,
                HC: runtimeData.monitor.restarts.healthCheck,
                BO: runtimeData.monitor.restarts.both,
            },
        },
        'Memory': {
            'Heap Used': `${runtimeData.memoryUsage.heap_used} (${runtimeData.memoryUsage.heap_pct}%)`,
            'Heap Limit': runtimeData.memoryUsage.heap_limit,
            'Physical': runtimeData.memoryUsage.physical,
            'Peak Alloc': runtimeData.memoryUsage.peak_malloced,
        },
        'Logger': {
            'Storage': {
                'Size': runtimeData.logger.storageSize.totalBytes,
                'Files': runtimeData.logger.storageSize.fileCount,
            },
            'Admin': runtimeData.logger.statusAdmin,
            'FXServer': runtimeData.logger.statusFXServer,
            'Server': runtimeData.logger.statusServer,
        },
    };

    //Host data
    if ('error' in hostData) {
        data.host = {
            'Error': hostData.error ?? 'unknown error',
        };
    } else {
        data.host = {
            'OS Distro': hostData.static.osDistro,
            'Username': hostData.static.username,
            'CPU Model': hostData.static.cpu.brand,
            'CPU Stats': `${hostData.static.cpu.physicalCores}c/${hostData.static.cpu.cores}t - ${hostData.static.cpu.speedMin} GHz`,
        };

        if (hostData.dynamic) {
            data.host['CPU Usage'] = `${hostData.dynamic.cpuUsage}%`;
            data.host['RAM Usage'] = `${hostData.dynamic.memory.usage}% (${hostData.dynamic.memory.used.toFixed(2)}/${hostData.dynamic.memory.total.toFixed(2)})`;
        }
    }

    //Server data
    const managerData = txManager.hostStatus;
    data.server = {
        'HashID': managerData.cfxId ?? '--',
        'Join Link': managerData.joinLink ?? '--',
        'CFG Path': managerData.cfgPath ?? '--',
        'Data Path': managerData.dataPath ?? '--',
        'Endpoint': txCore.fxRunner.child?.netEndpoint ?? '--',
        'Proj Name': managerData.projectName ?? '--',
    };

    //Processes data
    data.processes = processesData; //nothing to do here

    //Cache and send
    cache.set(data);
    return sendTypedResp(data);
};
