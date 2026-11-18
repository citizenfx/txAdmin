const modulename = 'WebServer:SendDiagnosticsReport';
import got from '@lib/got';
import { txEnv, txHostConfig } from '@core/globalData';
import { GenericApiErrorResp } from '@shared/genericApiTypes';
import * as diagnosticsFuncs from '@lib/diagnostics';
import { redactApiKeys, redactStartupSecrets } from '@lib/misc';
import { type ServerDataContentType, type ServerDataConfigsType, getServerDataContent, getServerDataConfigs } from '@lib/fxserver/serverData';
import MemCache from '@lib/MemCache';
import consoleFactory, { getLogBuffer } from '@lib/console';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import scanMonitorFiles from '@lib/fxserver/scanMonitorFiles';
const console = consoleFactory(modulename);

//Consts & Helpers
const reportIdCache = new MemCache<string>(60);
const maskedKeywords = ['key', 'license', 'pass', 'private', 'secret', 'token', 'webhook'];
const maskString = (input: string) => input.replace(/\w/gi, 'x');
const maskIps = (input: string) => input.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/gi, 'x.x.x.x');
type ServerLogType = {
    ts: number;
    type: string;
    src: {
        id: string | false;
        name: string;
    };
    msg: string;
}

/**
 * Prepares and sends the diagnostics report to txAPI
 */
export default async function SendDiagnosticsReport(ctx: AuthedCtx) {
    type SuccessResp = {
        reportId: string;
    };
    const sendTypedResp = (data: SuccessResp | GenericApiErrorResp) => ctx.send(data);

    //FIXME: re-enable
    return sendTypedResp({ error: 'The diagnostics report feature is temporarily disabled. Please check back later.' });

    //Rate limit (and cache) report submissions
    const cachedReportId = reportIdCache.get();
    if (cachedReportId) {
        return sendTypedResp({
            error: `You can send at most one report per minute. Your last report ID was ${cachedReportId}.`
        });
    }

    //Diagnostics
    let diagnostics;
    try {
        const [host, txadmin, proccesses] = await Promise.all([
            diagnosticsFuncs.getHostData(),
            diagnosticsFuncs.getRuntimeData(),
            diagnosticsFuncs.getProcessesData(),
        ]);
        diagnostics = { host, txadmin, proccesses };
    } catch (error) { }

    //Admins
    const adminList = (txCore.adminStore.getRawAdminsList() as any[])
        .map(a => ({ ...a, password_hash: '[REDACTED]' }));

    //Settings
    const storedConfigs = txCore.configStore.getStoredConfig() as any;
    if (storedConfigs?.discordBot?.token) {
        storedConfigs.discordBot.token = '[REDACTED]';
    }
    if (storedConfigs?.server?.startupArgs) {
        storedConfigs.server.startupArgs = redactStartupSecrets(storedConfigs.server.startupArgs);
    }

    //Env vars
    const envVars: Record<string, string> = {};
    for (const [envKey, envValue] of Object.entries(process.env)) {
        if (!envValue) continue;

        if (maskedKeywords.some((kw) => envKey.toLowerCase().includes(kw))) {
            envVars[envKey] = maskString(envValue);
        } else {
            envVars[envKey] = envValue;
        }
    }

    //Remove IP from logs
    const txSystemLog = maskIps(getLogBuffer());

    const rawTxActionLog = await txCore.logger.admin.getRecentBuffer();
    const txActionLog = (typeof rawTxActionLog !== 'string')
        ? 'error reading log file'
        : maskIps(rawTxActionLog).split('\n').slice(-500).join('\n');

    const serverLog = (txCore.logger.server.getRecentBuffer(500) as ServerLogType[])
        .map((l) => ({ ...l, msg: maskIps(l.msg) }));
    const fxserverLog = maskIps(txCore.logger.fxserver.getRecentBuffer());

    //Getting server data content
    let serverDataContent: ServerDataContentType = [];
    let cfgFiles: ServerDataConfigsType = [];
    //FIXME: use txCore.fxRunner.serverPaths
    if (storedConfigs.server?.dataPath) {
        serverDataContent = await getServerDataContent(storedConfigs.server.dataPath);
        const rawCfgFiles = await getServerDataConfigs(storedConfigs.server.dataPath, serverDataContent);
        cfgFiles = rawCfgFiles.map(([fName, fData]) => [fName, redactApiKeys(fData)]);
    }

    //Database & perf stats
    let dbStats = {};
    try {
        dbStats = txCore.database.stats.getDatabaseStats();
    } catch (error) { }

    let perfSvMain: ReturnType<typeof txCore.metrics.svRuntime.getServerPerfSummary> = null;
    try {
        perfSvMain = txCore.metrics.svRuntime.getServerPerfSummary();
    } catch (error) { }

    //Monitor integrity check
    let monitorContent = null;
    try {
        monitorContent = await scanMonitorFiles();
    } catch (error) { }

    //Prepare report object
    const reportData = {
        $schemaVersion: 2,
        $txVersion: txEnv.txaVersion,
        $fxVersion: txEnv.fxsVersion,
        $provider: String(txHostConfig.providerName), //we want an 'undefined'
        diagnostics,
        txSystemLog,
        txActionLog,
        serverLog,
        fxserverLog,
        envVars,
        perfSvMain,
        dbStats,
        settings: storedConfigs,
        adminList,
        serverDataContent,
        cfgFiles,
        monitorContent,
    };

    // //Preparing request
    const requestOptions = {
        url: `https://txapi.cfx-services.net/public/submit`,
        // url: `http://127.0.0.1:8121/public/submit`,
        retry: { limit: 1 },
        json: reportData,
    };

    //Making HTTP Request
    try {
        type ResponseType = { reportId: string } | { error: string, message?: string };
        const apiResp = await got.post(requestOptions).json() as ResponseType;
        if ('reportId' in apiResp) {
            reportIdCache.set(apiResp.reportId);
            console.warn(`Diagnostics data report ID ${apiResp.reportId} sent by ${ctx.admin.name}`);
            return sendTypedResp({ reportId: apiResp.reportId });
        } else {
            console.verbose.dir(apiResp);
            return sendTypedResp({ error: `Report failed: ${apiResp.message ?? apiResp.error}` });
        }
    } catch (error) {
        try {
            const apiErrorResp = JSON.parse((error as any)?.response?.body);
            const reason = apiErrorResp.message ?? apiErrorResp.error ?? (error as Error).message;
            return sendTypedResp({ error: `Report failed: ${reason}` });
        } catch (error2) {
            return sendTypedResp({ error: `Report failed: ${(error as Error).message}` });
        }
    }
};
