const modulename = 'WebServer:AuthOidc';
import consoleFactory from '@lib/console';
import { z } from 'zod';
import type { AuthedCtx, InitializedCtx } from '@modules/WebServer/ctxTypes';
import { AuthedAdmin, type OidcSessAuthType } from '@modules/WebServer/authLogic';
import type { ValidSessionType } from '@modules/WebServer/middlewares/sessionMws';
import type { OidcUserInfo } from '@modules/AdminStore/providers/GenericOidc';
import { checkRequiredClaim, findAvailableAdminName, sanitizeOidcUsername } from '@modules/AdminStore/providers/oidcUtils';
import type { ApiOauthCallbackErrorResp, ApiOauthCallbackResp, ApiOauthRedirectResp, ApiOidcLinkStatusResp, ReactAuthDataType } from '@shared/authApiTypes';
import type { GenericApiResp } from '@shared/genericApiTypes';
const console = consoleFactory(modulename);

//Helpers
const querySchema = z.object({
    origin: z.string(),
});
const bodySchema = z.object({
    redirectUri: z.string(),
});
export type ApiOidcCallbackReqSchema = z.infer<typeof bodySchema>;

type OidcPurpose = 'login' | 'link';
const callbackPaths: Record<OidcPurpose, string> = {
    login: '/login/oidc/callback',
    link: '/account/oidc/callback',
};

/**
 * Admins with these permissions are never linked automatically by username,
 * as that would allow a full takeover by anyone able to rename themselves in the IdP.
 */
const isPrivilegedAdmin = (vaultAdmin: any) => {
    return vaultAdmin.master === true
        || vaultAdmin.permissions.includes('all_permissions')
        || vaultAdmin.permissions.includes('manage.admins');
}


/**
 * Generates the auth url and stores the state/nonce/verifier in the session
 */
const startOidcFlow = async (ctx: InitializedCtx, purpose: OidcPurpose): Promise<ApiOauthRedirectResp> => {
    const schemaRes = querySchema.safeParse(ctx.request.query);
    if (!schemaRes.success) {
        return { error: `Invalid request query: ${schemaRes.error.message}` };
    }
    if (!txCore.adminStore.providers.oidc.isEnabled) {
        return { error: 'SSO login is not enabled.' };
    }

    const redirectUri = schemaRes.data.origin + callbackPaths[purpose];
    try {
        const { authUrl, ...secrets } = await txCore.adminStore.providers.oidc.getAuthRequest(redirectUri);
        const currSess = ctx.sessTools.get() as ValidSessionType | undefined;
        ctx.sessTools.set({
            //when linking, we need to keep the current auth
            ...(purpose === 'link' && currSess ? currSess : {}),
            tmpOidcAuth: { purpose, redirectUri, ...secrets },
        });
        return { authUrl };
    } catch (error) {
        console.warn(`Failed to start OIDC flow: ${(error as Error).message}`);
        return { error: `Failed to contact the SSO provider: ${(error as Error).message}` };
    }
}


/**
 * Validates the session, does the code exchange and checks the claim filter
 */
const finishOidcFlow = async (
    ctx: InitializedCtx,
    purpose: OidcPurpose,
): Promise<ApiOauthCallbackErrorResp | OidcUserInfo> => {
    const schemaRes = bodySchema.safeParse(ctx.request.body);
    if (!schemaRes.success) {
        return {
            errorTitle: 'Invalid request body',
            errorMessage: schemaRes.error.message,
        };
    }

    const tmpAuth = ctx.sessTools.get()?.tmpOidcAuth;
    if (!tmpAuth || tmpAuth.purpose !== purpose) {
        return { errorCode: 'invalid_session' };
    }

    let userInfo: OidcUserInfo;
    try {
        userInfo = await txCore.adminStore.providers.oidc.processCallback(
            tmpAuth.redirectUri,
            tmpAuth,
            schemaRes.data.redirectUri,
        );
    } catch (e) {
        const error = e as any;
        console.warn(`OIDC callback error: ${error.message}`);
        if (error.tolerance !== undefined) {
            return { errorCode: 'clock_desync' };
        } else if (error.code === 'ETIMEDOUT') {
            return { errorCode: 'timeout' };
        } else if (typeof error.message === 'string' && error.message.startsWith('state mismatch')) {
            return { errorCode: 'invalid_state' };
        } else if (error.name === 'OPError' && error.error === 'access_denied') {
            return { errorCode: 'end_user_aborted' };
        } else {
            return {
                errorTitle: 'SSO Login Error:',
                errorMessage: error.message,
            };
        }
    }

    const cfg = txConfig.oidc;
    if (!checkRequiredClaim(userInfo.claims, cfg.requiredClaim, cfg.requiredClaimValue)) {
        console.warn(`OIDC user '${userInfo.username ?? userInfo.sub}' denied by the required claim filter.`);
        return {
            errorCode: 'oidc_claim_denied',
            errorContext: {
                name: userInfo.username ?? userInfo.sub,
            },
        };
    }

    return userInfo;
}


/**
 * GET /auth/oidc/redirect
 */
export async function oidcLoginRedirect(ctx: InitializedCtx) {
    if (!txCore.adminStore.hasAdmins()) {
        return ctx.send<ApiOauthRedirectResp>({ error: 'no_admins_setup' });
    }
    return ctx.send<ApiOauthRedirectResp>(await startOidcFlow(ctx, 'login'));
}


/**
 * POST /auth/oidc/callback
 * Flow: find by sub -> link by username (if enabled) -> auto create (if enabled) -> login
 */
export async function oidcLoginCallback(ctx: InitializedCtx) {
    const callbackResp = await finishOidcFlow(ctx, 'login');
    if ('errorCode' in callbackResp || 'errorTitle' in callbackResp) {
        ctx.sessTools.destroy();
        return ctx.send<ApiOauthCallbackResp>(callbackResp);
    }
    const userInfo = callbackResp;
    const cfg = txConfig.oidc;
    const adminStore = txCore.adminStore;
    const displayName = userInfo.username ?? userInfo.email ?? userInfo.sub;

    try {
        //1. Find by subject
        let vaultAdmin = adminStore.getAdminByOidcSub(userInfo.issuer, userInfo.sub);

        //2. Link existing account by username
        if (!vaultAdmin && cfg.linkByUsername && userInfo.username) {
            const candidate = adminStore.getAdminByName(userInfo.username);
            if (candidate) {
                if (candidate.providers.oidc || isPrivilegedAdmin(candidate)) {
                    ctx.sessTools.destroy();
                    return ctx.send<ApiOauthCallbackResp>({
                        errorCode: 'oidc_link_denied',
                        errorContext: { name: candidate.name },
                    });
                }
                await adminStore.setAdminOidcLink(candidate.name, userInfo);
                txCore.logger.admin.write('txAdmin', `Linked SSO account '${displayName}' to admin '${candidate.name}' by username.`);
                vaultAdmin = adminStore.getAdminByName(candidate.name);
            }
        }

        //3. Auto create account
        if (!vaultAdmin && cfg.autoCreateAccounts) {
            const baseName = sanitizeOidcUsername(userInfo.username ?? userInfo.email);
            const newName = findAvailableAdminName(baseName, (name) => !!adminStore.getAdminByName(name));
            const permissions = cfg.defaultPermissions.filter(
                (perm) => perm in adminStore.getPermissionsList()
            );
            await adminStore.addOidcAdmin(newName, userInfo, permissions);
            txCore.logger.admin.write('txAdmin', `Created admin '${newName}' for SSO account '${displayName}' with permissions: ${permissions.join(', ') || 'none'}.`);
            vaultAdmin = adminStore.getAdminByName(newName);
        }

        if (!vaultAdmin) {
            ctx.sessTools.destroy();
            return ctx.send<ApiOauthCallbackResp>({
                errorCode: 'not_admin_oidc',
                errorContext: { name: displayName },
            });
        }

        //Setting session
        const sessData = {
            type: 'oidc',
            username: vaultAdmin.name,
            csrfToken: adminStore.genCsrfToken(),
            expiresAt: Date.now() + 86_400_000, //24h
            issuer: userInfo.issuer,
            sub: userInfo.sub,
        } satisfies OidcSessAuthType;
        ctx.sessTools.set({ auth: sessData });

        if (userInfo.picture) {
            txCore.cacheStore.set(`admin:picture:${vaultAdmin.name}`, userInfo.picture);
        }

        const authedAdmin = new AuthedAdmin(vaultAdmin, sessData.csrfToken);
        authedAdmin.logAction(`logged in from ${ctx.ip} via sso auth`);
        txCore.metrics.txRuntime.loginOrigins.count(ctx.txVars.hostType);
        txCore.metrics.txRuntime.loginMethods.count('oidc');
        return ctx.send<ReactAuthDataType>(authedAdmin.getAuthData());
    } catch (error) {
        ctx.sessTools.destroy();
        console.verbose.error(`Failed to login: ${(error as Error).message}`);
        return ctx.send<ApiOauthCallbackResp>({
            errorTitle: 'Failed to login:',
            errorMessage: (error as Error).message,
        });
    }
}


/**
 * GET /auth/oidc/link
 */
export async function oidcLinkStatus(ctx: AuthedCtx) {
    const vaultAdmin = txCore.adminStore.getAdminByName(ctx.admin.name);
    if (!vaultAdmin) throw new Error('Wait, what? Where is that admin?');
    const oidcData = vaultAdmin.providers.oidc?.data;
    return ctx.send<ApiOidcLinkStatusResp>({
        enabled: txCore.adminStore.providers.oidc.isEnabled,
        linked: !!oidcData,
        username: oidcData?.username,
        email: oidcData?.email,
        linkedAt: oidcData?.linkedAt,
    });
}


/**
 * GET /auth/oidc/link/redirect
 */
export async function oidcLinkRedirect(ctx: AuthedCtx) {
    return ctx.send<ApiOauthRedirectResp>(await startOidcFlow(ctx, 'link'));
}


/**
 * POST /auth/oidc/link/callback
 */
export async function oidcLinkCallback(ctx: AuthedCtx) {
    const callbackResp = await finishOidcFlow(ctx, 'link');

    //Drop the temp data but keep the auth
    const currSess = ctx.sessTools.get() as ValidSessionType | undefined;
    if (currSess) {
        const { tmpOidcAuth, ...rest } = currSess;
        ctx.sessTools.set(rest);
    }

    if ('errorCode' in callbackResp || 'errorTitle' in callbackResp) {
        return ctx.send<ApiOauthCallbackErrorResp>(callbackResp);
    }
    const userInfo = callbackResp;
    try {
        await txCore.adminStore.setAdminOidcLink(ctx.admin.name, userInfo);
        ctx.admin.logAction(`Linked own account to SSO account '${userInfo.username ?? userInfo.email ?? userInfo.sub}'.`);
        return ctx.send<GenericApiResp>({ success: true });
    } catch (error) {
        return ctx.send<ApiOauthCallbackErrorResp>({
            errorTitle: 'Failed to link SSO account:',
            errorMessage: (error as Error).message,
        });
    }
}


/**
 * POST /auth/oidc/unlink
 */
export async function oidcUnlink(ctx: AuthedCtx) {
    if (ctx.admin.hasSsoGeneratedPassword) {
        return ctx.send<GenericApiResp>({
            error: 'Your account was created via SSO and has no password. Please set a password before unlinking, otherwise you will be locked out.',
        });
    }
    try {
        await txCore.adminStore.setAdminOidcLink(ctx.admin.name, false);
        ctx.admin.logAction('Unlinked own account from SSO.');
        return ctx.send<GenericApiResp>({ success: true });
    } catch (error) {
        return ctx.send<GenericApiResp>({ error: (error as Error).message });
    }
}
