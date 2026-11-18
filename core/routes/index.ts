export { default as diagnostics_sendReport } from './diagnostics/sendReport';
export { default as diagnostics_getDiagnostics } from './diagnostics/getDiagnostics';
export { default as intercom } from './intercom.js';
export { default as resources } from './resources.js';
export { default as perfChart } from './perfChart';
export { default as playerDrops } from './playerDrops';
export { default as systemLogs } from './systemLogs';

export { default as auth_addMasterPin } from './authentication/addMasterPin.js';
export { default as auth_addMasterCallback } from './authentication/addMasterCallback.js';
export { default as auth_addMasterSave } from './authentication/addMasterSave.js';
export { default as auth_providerRedirect } from './authentication/providerRedirect';
export { default as auth_providerCallback } from './authentication/providerCallback';
export { default as auth_verifyPassword } from './authentication/verifyPassword';
export { default as auth_changePassword } from './authentication/changePassword';
export { default as auth_self } from './authentication/self';
export { default as auth_logout } from './authentication/logout';
export { default as auth_getIdentifiers } from './authentication/getIdentifiers';
export { default as auth_changeIdentifiers } from './authentication/changeIdentifiers';

export { default as adminManager_page } from './adminManager/page.js';
export { default as adminManager_getModal } from './adminManager/getModal';
export { default as adminManager_actions } from './adminManager/actions';

export { default as cfgEditor_page } from './cfgEditor/get';
export { default as cfgEditor_save } from './cfgEditor/save';

export { default as deployer_stepper } from './deployer/stepper';
export { default as deployer_status } from './deployer/status';
export { default as deployer_actions } from './deployer/actions';

//FIXME join bantemplates with settings
export { default as settings_getConfigs } from './settings/getConfigs';
export { default as settings_saveConfigs } from './settings/saveConfigs';
export { default as settings_getBanTemplates } from './banTemplates/getBanTemplates';
export { default as settings_saveBanTemplates } from './banTemplates/saveBanTemplates';
export { default as settings_resetServerDataPath } from './settings/resetServerDataPath';

export { default as masterActions_page } from './masterActions/page';
export { default as masterActions_getBackup } from './masterActions/getBackup';
export { default as masterActions_actions } from './masterActions/actions';

export { default as setup_get } from './setup/get';
export { default as setup_post } from './setup/post';

export { default as fxserver_commands } from './fxserver/commands';
export { default as fxserver_controls } from './fxserver/controls';
export { default as fxserver_downloadLog } from './fxserver/downloadLog';
export { default as fxserver_schedule } from './fxserver/schedule';

export { default as history_stats } from './history/stats';
export { default as history_search } from './history/search';
export { default as history_actionModal } from './history/actionModal';
export { default as history_actions } from './history/actions.js';

export { default as player_stats } from './player/stats';
export { default as player_search } from './player/search';
export { default as player_modal } from './player/modal';
export { default as player_actions } from './player/actions';
export { default as player_checkJoin } from './player/checkJoin';

export { default as whitelist_page } from './whitelist/page';
export { default as whitelist_list } from './whitelist/list';
export { default as whitelist_actions } from './whitelist/actions';

export { default as advanced_runCommand } from './advanced/runCommand';

//FIXME: reorganizar TODAS rotas de logs, incluindo listagem e download
export { default as serverLog } from './serverLog.js';
export { default as serverLogPartial } from './serverLogPartial.js';

export { default as host_status } from './hostStatus';

export {
    get as dev_get,
    post as dev_post,
} from './devDebug.js';
