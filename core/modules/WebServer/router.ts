import { txDevEnv } from '@core/globalData';
import Router from '@koa/router';
import KoaRateLimit from 'koa-ratelimit';

import * as routes from '@routes/index';
import { apiAuthMw, hostAuthMw, intercomAuthMw, webAuthMw } from './middlewares/authMws';


/**
 * Router factory
 */
export default () => {
    const router = new Router();
    const authLimiter = KoaRateLimit({
        driver: 'memory',
        db: new Map(),
        duration: txConfig.webServer.limiterMinutes * 60 * 1000, // 15 minutes
        errorMessage: JSON.stringify({
            //Duplicated to maintain compatibility with all auth api routes
            error: `Too many attempts. Blocked for ${txConfig.webServer.limiterMinutes} minutes.`,
            errorTitle: 'Too many attempts.',
            errorMessage: `Blocked for ${txConfig.webServer.limiterMinutes} minutes.`,
        }),
        max: txConfig.webServer.limiterAttempts,
        disableHeader: true,
        id: (ctx: any) => ctx.txVars.realIP,
    });

    //Rendered Pages
    router.get('/legacy/adminManager', webAuthMw, routes.adminManager_page);
    router.get('/legacy/cfgEditor', webAuthMw, routes.cfgEditor_page);
    router.get('/legacy/masterActions', webAuthMw, routes.masterActions_page);
    router.get('/legacy/resources', webAuthMw, routes.resources);
    router.get('/legacy/serverLog', webAuthMw, routes.serverLog);
    // FIXME:NEXT:UPDATE rename route handler
    router.get('/legacy/allowlist', webAuthMw, routes.whitelist_page);
    router.get('/legacy/setup', webAuthMw, routes.setup_get);
    router.get('/legacy/deployer', webAuthMw, routes.deployer_stepper);

    //Authentication
    router.get('/auth/self', apiAuthMw, routes.auth_self);
    router.post('/auth/password', authLimiter, routes.auth_verifyPassword);
    router.post('/auth/logout', authLimiter, routes.auth_logout);
    router.post('/auth/addMaster/pin', authLimiter, routes.auth_addMasterPin);
    router.post('/auth/addMaster/callback', authLimiter, routes.auth_addMasterCallback);
    router.post('/auth/addMaster/save', authLimiter, routes.auth_addMasterSave);
    router.get('/auth/cfxre/redirect', authLimiter, routes.auth_providerRedirect);
    router.post('/auth/cfxre/callback', authLimiter, routes.auth_providerCallback);
    router.post('/auth/changePassword', apiAuthMw, routes.auth_changePassword);
    router.get('/auth/getIdentifiers', apiAuthMw, routes.auth_getIdentifiers);
    router.post('/auth/changeIdentifiers', apiAuthMw, routes.auth_changeIdentifiers);

    //Admin Manager
    router.post('/adminManager/getModal/:modalType', webAuthMw, routes.adminManager_getModal);
    router.post('/adminManager/:action', apiAuthMw, routes.adminManager_actions);

    //Settings
    router.post('/setup/:action', apiAuthMw, routes.setup_post);
    router.get('/deployer/status', apiAuthMw, routes.deployer_status);
    router.post('/deployer/recipe/:action', apiAuthMw, routes.deployer_actions);
    router.get('/settings/configs', apiAuthMw, routes.settings_getConfigs);
    router.post('/settings/configs/:card', apiAuthMw, routes.settings_saveConfigs);
    router.get('/settings/banTemplates', apiAuthMw, routes.settings_getBanTemplates);
    router.post('/settings/banTemplates', apiAuthMw, routes.settings_saveBanTemplates);
    router.post('/settings/resetServerDataPath', apiAuthMw, routes.settings_resetServerDataPath);

    //Master Actions
    router.get('/masterActions/backupDatabase', webAuthMw, routes.masterActions_getBackup);
    router.post('/masterActions/:action', apiAuthMw, routes.masterActions_actions);

    //FXServer
    router.post('/fxserver/controls', apiAuthMw, routes.fxserver_controls);
    router.post('/fxserver/commands', apiAuthMw, routes.fxserver_commands);
    router.get('/fxserver/downloadLog', webAuthMw, routes.fxserver_downloadLog);
    router.post('/fxserver/schedule', apiAuthMw, routes.fxserver_schedule);

    //CFG Editor
    router.post('/cfgEditor/save', apiAuthMw, routes.cfgEditor_save);

    //Control routes
    router.post('/intercom/:scope', intercomAuthMw, routes.intercom);

    //Diagnostic routes
    router.get('/diagnostics/getDiagnostics', apiAuthMw, routes.diagnostics_getDiagnostics);
    router.post('/diagnostics/sendReport', apiAuthMw, routes.diagnostics_sendReport);
    router.post('/advanced/run', apiAuthMw, routes.advanced_runCommand);

    //Data routes
    router.get('/serverLog/partial', apiAuthMw, routes.serverLogPartial);
    router.get('/systemLog/:scope', apiAuthMw, routes.systemLogs);
    router.get('/perfChartData/:thread', apiAuthMw, routes.perfChart);
    router.get('/playerDropsData', apiAuthMw, routes.playerDrops);

    /*
        FIXME: reorganizar TODAS rotas de logs, incluindo listagem e download
        /logs/:logpage - WEB
        /logs/:log/list - API
        /logs/:log/partial - API
        /logs/:log/download - WEB
    */

    //History routes
    router.get('/history/stats', apiAuthMw, routes.history_stats);
    router.get('/history/search', apiAuthMw, routes.history_search);
    router.get('/history/action', apiAuthMw, routes.history_actionModal);
    router.post('/history/:action', apiAuthMw, routes.history_actions);

    //Player routes
    router.get('/player', apiAuthMw, routes.player_modal);
    router.get('/player/stats', apiAuthMw, routes.player_stats);
    router.get('/player/search', apiAuthMw, routes.player_search);
    router.post('/player/checkJoin', intercomAuthMw, routes.player_checkJoin);
    router.post('/player/:action', apiAuthMw, routes.player_actions);
    router.get('/whitelist/:table', apiAuthMw, routes.whitelist_list);
    router.post('/whitelist/:table/:action', apiAuthMw, routes.whitelist_actions);

    //Host routes
    router.get('/host/status', hostAuthMw, routes.host_status);

    //DevDebug routes - no auth
    if (txDevEnv.ENABLED) {
        router.get('/dev/:scope', routes.dev_get);
        router.post('/dev/:scope', routes.dev_post);
    };

    //Insights page mock
    // router.get('/insights', (ctx) => {
    //     return ctx.utils.render('main/insights', { headerTitle: 'Insights' });
    // });

    //Return router
    return router;
};
