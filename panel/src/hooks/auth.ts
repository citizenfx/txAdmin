import { ApiLogoutResp, ReactAuthDataType } from '@shared/authApiTypes';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { atomEffect } from 'jotai-effect';
import { accountModalOpenAtom, confirmDialogOpenAtom, promptDialogOpenAtom } from './dialogs';
import { isGlobalMenuSheetOpenAtom, isPlayerlistSheetOpenAtom, isServerSheetOpenAtom } from './sheets';
import { playerModalOpenAtom } from './playerModal';
import { globalStatusAtom } from './status';
import { txToast } from '@/components/TxToaster';
import { actionModalOpenAtom } from './actionModal';
import { dashDataTsAtom, dashPerfCursorAtom, dashPlayerDropAtom, dashServerStatsAtom, dashSvRuntimeAtom } from '@/pages/Dashboard/dashboardHooks';
import { redirectToLogin } from '@/lib/navigation';
import { LogoutReasonHash } from '@/pages/auth/Login';
import { mutate } from 'swr';
import { fetchWithTimeout } from './fetch';
import consts from '@shared/consts';


/**
 * Atoms
 */
const authDataAtom = atom<ReactAuthDataType | false>(window.txConsts.preAuth);
const isAuthenticatedAtom = atom((get) => !!get(authDataAtom))
const csrfTokenAtom = atom((get) => {
    const authData = get(authDataAtom);
    return authData ? authData.csrfToken : undefined;
});
const adminPermissionsAtom = atom((get) => {
    const authData = get(authDataAtom);
    if (!authData) return undefined;
    return {
        permissions: authData.permissions,
        isMaster: authData.isMaster,
    };
});


/**
 * Hooks
 */
//Authentication hook, only re-renders on login/logout
export const useIsAuthenticated = () => {
    return useAtomValue(isAuthenticatedAtom);
};

//CSRF hook, only re-renders on login/logout
export const useCsrfToken = () => {
    return useAtomValue(csrfTokenAtom);
};

//Simple setter for auth data
export const useSetAuthData = () => {
    return useSetAtom(authDataAtom)
};

//Admin permissions hook, only re-renders on perms change or login/logout
//Perms logic from core/modules/WebServer/authLogic.ts
export const useAdminPerms = () => {
    const permsData = useAtomValue(adminPermissionsAtom);

    const hasPerm = (perm: string) => {
        if (!permsData) return false;
        try {
            if (perm === 'master') {
                return permsData.isMaster;
            }
            return (
                permsData.isMaster
                || permsData.permissions.includes('all_permissions')
                || permsData.permissions.includes(perm)
            );
        } catch (error) {
            console.error(`Error validating permission '${perm}' denied.`);
            return false;
        }
    }

    return {
        hasPerm,
        isMaster: permsData ? permsData.isMaster : false,
        //NOTE: this one really shouldn't be used
        // permissions: permsData ? permsData.permissions : [], 
    };
};

//Wipes auth data from the atom, this is triggered when an api pr page call returns a logout notice
//Since this is triggered by a logout notice, we don't need to bother doing a POST /auth/logout
export const useExpireAuthData = () => {
    const setAuthData = useSetAtom(authDataAtom);
    return (src = 'unknown', reason = 'unknown', reasonHash = LogoutReasonHash.EXPIRED) => {
        console.log('[useExpireAuthData] Logout notice received:', { src, reason, reasonHash });
        setAuthData(false);
        redirectToLogin(reasonHash);
    }
}

//Generic authentication hook, using it will cause your component to re-render on _any_ auth changes
export const useAuth = () => {
    const [authData, setAuthData] = useAtom(authDataAtom);

    const logout = () => fetchWithTimeout<ApiLogoutResp>(`/auth/logout`, { method: 'POST' }).then(data => {
        if (data.logout) {
            console.log('[useAuth] Manually triggered logout.');
            setAuthData(false);
            redirectToLogin(LogoutReasonHash.LOGOUT);
        } else {
            console.error('Failed to logout:', data);
            // Still wipe auth even if the request fails
            setAuthData(false);
            redirectToLogin(LogoutReasonHash.LOGOUT);
        }
    }).catch(error => {
        console.log('Error sending logout request:', error);
        // Still wipe auth even if the request fails
        setAuthData(false);
        redirectToLogin(LogoutReasonHash.LOGOUT);
    });

    return {
        authData,
        setAuthData,
        logout,
    }
};

//Effect to on logout, automagically close all dialogs/modals and reset globalState
export const logoutWatcher: ReturnType<typeof atomEffect> = atomEffect((get, set) => {
    const isAuthenticated = get(isAuthenticatedAtom);
    if (isAuthenticated) return;

    console.info('[logoutWatcher] Logout Detected, closing all dialogs and modals.');
    set(accountModalOpenAtom, false);
    set(confirmDialogOpenAtom, false);
    set(promptDialogOpenAtom, false);
    set(isGlobalMenuSheetOpenAtom, false);
    set(isServerSheetOpenAtom, false);
    set(isPlayerlistSheetOpenAtom, false);
    set(playerModalOpenAtom, false);
    set(actionModalOpenAtom, false);
    set(globalStatusAtom, null);
    set(dashPlayerDropAtom, undefined);
    set(dashServerStatsAtom, undefined);
    set(dashSvRuntimeAtom, undefined);
    set(dashPerfCursorAtom, undefined);
    set(dashDataTsAtom, 0);
    txToast.dismiss(); //making sure we don't have any pending toasts

    //Force invalidation of all cached data in SWR
    mutate(() => true, undefined, { revalidate: false });

    //TODO: maybe also erase playerlist/mutex?
});
