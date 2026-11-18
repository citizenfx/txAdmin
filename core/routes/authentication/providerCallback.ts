const modulename = 'WebServer:AuthProviderCallback';
import consoleFactory from '@lib/console';
import { InitializedCtx } from '@modules/WebServer/ctxTypes';
import { AuthedAdmin, CfxreSessAuthType } from '@modules/WebServer/authLogic';
import { z } from 'zod';
import { ApiOauthCallbackErrorResp, ApiOauthCallbackResp, ReactAuthDataType } from '@shared/authApiTypes';
import { handleOauthCallback } from './oauthMethods';
import { getIdFromOauthNameid } from '@lib/player/idUtils';
const console = consoleFactory(modulename);

//Helper functions
const bodySchema = z.object({
    redirectUri: z.string(),
});
export type ApiOauthCallbackReqSchema = z.infer<typeof bodySchema>;

/**
 * Handles the provider login callbacks
 */
export default async function AuthProviderCallback(ctx: InitializedCtx) {
    const schemaRes = bodySchema.safeParse(ctx.request.body);
    if (!schemaRes.success) {
        return ctx.send<ApiOauthCallbackResp>({
            errorTitle: 'Invalid request body',
            errorMessage: schemaRes.error.message,
        });
    }
    const { redirectUri } = schemaRes.data;

    //Handling the callback
    const callbackResp = await handleOauthCallback(ctx, redirectUri);
    if('errorCode' in callbackResp || 'errorTitle' in callbackResp){
        return ctx.send<ApiOauthCallbackErrorResp>(callbackResp);
    }
    const userInfo = callbackResp;

    //Getting identifier
    const fivemIdentifier = getIdFromOauthNameid(userInfo.nameid);
    if(!fivemIdentifier){
        return ctx.send<ApiOauthCallbackResp>({
            errorTitle: 'Invalid nameid identifier.',
            errorMessage: `Could not extract the user identifier from the URL below. Please report this to the txAdmin dev team.\n${userInfo.nameid.toString()}`,
        });
    }

    //Check & Login user
    try {
        const vaultAdmin = txCore.adminStore.getAdminByIdentifiers([fivemIdentifier]);
        if (!vaultAdmin) {
            ctx.sessTools.destroy();
            return ctx.send<ApiOauthCallbackResp>({
                errorCode: 'not_admin',
                errorContext: {
                    identifier: fivemIdentifier,
                    name: userInfo.name,
                    profile: userInfo.profile
                }
            });
        }

        //Setting session
        const sessData = {
            type: 'cfxre',
            username: vaultAdmin.name,
            csrfToken: txCore.adminStore.genCsrfToken(),
            expiresAt: Date.now() + 86_400_000, //24h,
            identifier: fivemIdentifier,
        } satisfies CfxreSessAuthType;
        ctx.sessTools.set({ auth: sessData });

        //If the user has a picture, save it to the cache
        if (userInfo.picture) {
            txCore.cacheStore.set(`admin:picture:${vaultAdmin.name}`, userInfo.picture);
        }

        const authedAdmin = new AuthedAdmin(vaultAdmin, sessData.csrfToken);
        authedAdmin.logAction(`logged in from ${ctx.ip} via cfxre auth`);
        txCore.metrics.txRuntime.loginOrigins.count(ctx.txVars.hostType);
        txCore.metrics.txRuntime.loginMethods.count('citizenfx');
        return ctx.send<ReactAuthDataType>(authedAdmin.getAuthData());
    } catch (error) {
        ctx.sessTools.destroy();
        console.verbose.error(`Failed to login: ${(error as Error).message}`);
        return ctx.send<ApiOauthCallbackResp>({
            errorTitle: 'Failed to login:',
            errorMessage: (error as Error).message,
        });
    }
};
