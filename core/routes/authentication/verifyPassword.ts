const modulename = 'WebServer:AuthVerifyPassword';
import { AuthedAdmin, PassSessAuthType } from '@modules/WebServer/authLogic';
import { InitializedCtx } from '@modules/WebServer/ctxTypes';
import { txEnv } from '@core/globalData';
import consoleFactory from '@lib/console';
import { ApiVerifyPasswordResp, ReactAuthDataType } from '@shared/authApiTypes';
import { verifyPassword } from '@modules/AdminStore/passwordUtils';
import { isIpAddressLocal } from '@lib/host/isIpAddressLocal';
import { z } from 'zod';
const console = consoleFactory(modulename);

//Helper functions
const bodySchema = z.object({
    username: z.string().trim(),
    password: z.string().trim(),
});
export type ApiVerifyPasswordReqSchema = z.infer<typeof bodySchema>;

const maxLoginAttempts = 10;
const lockoutMinutes = 5;
const failedLoginAttempts = new Map<string, { count: number, lockedUntil: number }>();

const getLoginLockKey = (ip: string, username: string) => `${ip}|${username.toLowerCase()}`;

const isLoginLocked = (ip: string, username: string) => {
    const entry = failedLoginAttempts.get(getLoginLockKey(ip, username));
    return entry !== undefined && entry.count >= maxLoginAttempts && Date.now() < entry.lockedUntil;
};

const registerFailedLogin = (ip: string, username: string) => {
    const key = getLoginLockKey(ip, username);
    const entry = failedLoginAttempts.get(key) ?? { count: 0, lockedUntil: 0 };
    entry.count++;
    entry.lockedUntil = Date.now() + lockoutMinutes * 60_000;
    failedLoginAttempts.set(key, entry);
};

const clearFailedLogins = (ip: string, username: string) => {
    failedLoginAttempts.delete(getLoginLockKey(ip, username));
};

setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of failedLoginAttempts) {
        if (now >= entry.lockedUntil) failedLoginAttempts.delete(key);
    }
}, 60_000);

/**
 * Verify login
 */
export default async function AuthVerifyPassword(ctx: InitializedCtx) {
    //Check UI version
    const { uiVersion } = ctx.request.query;
    if(uiVersion && uiVersion !== txEnv.txaVersion){
        return ctx.send<ApiVerifyPasswordResp>({
            error: `refreshToUpdate`,
        });
    }

    //Checking body
    const schemaRes = bodySchema.safeParse(ctx.request.body);
    if (!schemaRes.success) {
        return ctx.send<ApiVerifyPasswordResp>({
            error: `Invalid request body: ${schemaRes.error.message}`,
        });
    }
    const postBody = schemaRes.data;

    //Check if there are already admins set up
    if (!txCore.adminStore.hasAdmins()) {
        return ctx.send<ApiVerifyPasswordResp>({
            error: `no_admins_setup`,
        });
    }

    try {
        if (!isIpAddressLocal(ctx.ip) && isLoginLocked(ctx.ip, postBody.username)) {
            console.warn(`Login locked out for '${postBody.username}' from: ${ctx.ip}`);
            return ctx.send<ApiVerifyPasswordResp>({
                error: `Too many failed login attempts. Try again in a few minutes.`,
            });
        }

        //Checking admin
        const vaultAdmin = txCore.adminStore.getAdminByName(postBody.username);
        if (!vaultAdmin) {
            console.warn(`Wrong username from: ${ctx.ip}`);
            registerFailedLogin(ctx.ip, postBody.username);
            return ctx.send<ApiVerifyPasswordResp>({
                error: 'Wrong username or password!',
            });
        }
        if (!await verifyPassword(postBody.password, vaultAdmin.password_hash)) {
            console.warn(`Wrong password from: ${ctx.ip}`);
            registerFailedLogin(ctx.ip, postBody.username);
            return ctx.send<ApiVerifyPasswordResp>({
                error: 'Wrong username or password!',
            });
        }
        clearFailedLogins(ctx.ip, postBody.username);

        //Setting up session
        const sessData = {
            type: 'password',
            username: vaultAdmin.name,
            password_hash: vaultAdmin.password_hash,
            expiresAt: false,
            csrfToken: txCore.adminStore.genCsrfToken(),
        } satisfies PassSessAuthType;
        ctx.sessTools.set({ auth: sessData });

        const authedAdmin = new AuthedAdmin(vaultAdmin, sessData.csrfToken);
        authedAdmin.logAction(`logged in from ${ctx.ip} via password auth`);
        txCore.metrics.txRuntime.loginOrigins.count(ctx.txVars.hostType);
        txCore.metrics.txRuntime.loginMethods.count('password');
        return ctx.send<ReactAuthDataType>(authedAdmin.getAuthData());
    } catch (error) {
        console.warn(`Failed to authenticate ${postBody.username} with error: ${(error as Error).message}`);
        console.verbose.dir(error);
        return ctx.send<ApiVerifyPasswordResp>({
            error: 'Error autenticating admin.',
        });
    }
};
