const modulename = 'WebServer:AuthChangePassword';
import { AuthedCtx } from '@modules/WebServer/ctxTypes';
import consoleFactory from '@lib/console';
import consts from '@shared/consts';
import { GenericApiResp } from '@shared/genericApiTypes';
import { verifyPassword } from '@modules/AdminStore/passwordUtils';
import { z } from 'zod';
const console = consoleFactory(modulename);

//Helper functions
const bodySchema = z.object({
    oldPassword: z.string().optional(),
    newPassword: z.string(),
});
export type ApiChangePasswordReqSchema = z.infer<typeof bodySchema>;


/**
 * Route to change your own password
 */
export default async function AuthChangePassword(ctx: AuthedCtx) {
    //Sanity check
    const schemaRes = bodySchema.safeParse(ctx.request.body);
    if (!schemaRes.success) {
        return ctx.send<GenericApiResp>({
            error: `Invalid request body: ${schemaRes.error.message}`,
        });
    }
    const { newPassword, oldPassword } = schemaRes.data;

    //Validate new password
    if (newPassword.trim() !== newPassword) {
        return ctx.send<GenericApiResp>({
            error: 'Your password either starts or ends with a space, which was likely an accident. Please remove it and try again.',
        });
    }
    if (newPassword.length < consts.adminPasswordMinLength || newPassword.length > consts.adminPasswordMaxLength) {
        return ctx.send<GenericApiResp>({ error: 'Invalid new password length.' });
    }

    //Get vault admin
    const vaultAdmin = txCore.adminStore.getAdminByName(ctx.admin.name);
    if (!vaultAdmin) throw new Error('Wait, what? Where is that admin?');
    //Admins auto-created via SSO don't know their random password
    const sessType = ctx.sessTools.get()?.auth?.type;
    const canSkipOldPassword = ctx.admin.isTempPassword
        || (vaultAdmin.password_sso_generated === true && sessType === 'oidc');
    if (!canSkipOldPassword) {
        if (!oldPassword || !await verifyPassword(oldPassword, vaultAdmin.password_hash)) {
            return ctx.send<GenericApiResp>({ error: 'Wrong current password.' });
        }
    }

    //Edit admin and give output
    try {
        const newHash = await txCore.adminStore.editAdmin(ctx.admin.name, newPassword);

        //Update session hash if logged in via password
        const currSess = ctx.sessTools.get();
        if (currSess?.auth?.type === 'password') {
            ctx.sessTools.set({
                auth: {
                    ...currSess.auth,
                    password_hash: newHash,
                }
            });
        }

        ctx.admin.logAction('Changing own password.');
        return ctx.send<GenericApiResp>({ success: true });
    } catch (error) {
        return ctx.send<GenericApiResp>({ error: (error as Error).message });
    }
};
