import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import SwitchText from '@/components/SwitchText';
import InlineCode from '@/components/InlineCode';
import { AdvancedDivider, SettingItem, SettingItemDesc, SettingItemWarningLine } from '../settingsItems';
import { useState, useEffect, useMemo, useReducer, useRef } from "react";
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff } from "../utils";
import SettingsCardShell from "../SettingsCardShell";
import { txToast } from "@/components/TxToaster";
import { useOpenConfirmDialog } from "@/hooks/dialogs";


export const pageConfigs = {
    enabled: getPageConfig('oidc', 'enabled'),
    issuerUrl: getPageConfig('oidc', 'issuerUrl'),
    clientId: getPageConfig('oidc', 'clientId'),
    clientSecret: getPageConfig('oidc', 'clientSecret'),
    buttonLabel: getPageConfig('oidc', 'buttonLabel'),
    requiredClaim: getPageConfig('oidc', 'requiredClaim'),
    requiredClaimValue: getPageConfig('oidc', 'requiredClaimValue'),
    linkByUsername: getPageConfig('oidc', 'linkByUsername'),
    autoCreateAccounts: getPageConfig('oidc', 'autoCreateAccounts'),
    defaultPermissions: getPageConfig('oidc', 'defaultPermissions'),

    scopes: getPageConfig('oidc', 'scopes', true),
    usernameClaim: getPageConfig('oidc', 'usernameClaim', true),
} as const;

//Permissions that give full control over txAdmin
const PRIVILEGED_PERMISSIONS: Record<string, string> = {
    all_permissions: 'Everyone able to login via your Identity Provider will automatically get FULL ACCESS to txAdmin: start/stop the server, edit the server.cfg, use the live console, ban players and change all settings, including secrets.',
    'manage.admins': 'Everyone able to login via your Identity Provider will automatically be able to create, edit and delete admins, including giving themselves (or others) any permission.',
};

const emptyToNull = (str?: string) => {
    if (str === undefined) return undefined;
    const trimmed = str.trim();
    return trimmed.length ? trimmed : null;
};


export default function ConfigCardSso({ cardCtx, pageCtx }: SettingsCardProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const openConfirmDialog = useOpenConfirmDialog();
    const [states, dispatch] = useReducer(
        configsReducer<typeof pageConfigs>,
        null,
        () => getConfigEmptyState(pageConfigs),
    );
    const cfg = useMemo(() => {
        return getConfigAccessors(cardCtx.cardId, pageConfigs, pageCtx.apiData, dispatch);
    }, [pageCtx.apiData, dispatch]);

    //Effects - handle changes and reset advanced settings
    useEffect(() => {
        updatePageState();
    }, [states]);
    useEffect(() => {
        if (showAdvanced) return;
        Object.values(cfg).forEach(c => c.isAdvanced && c.state.discard());
    }, [showAdvanced]);

    //Refs for configs that don't use state
    const issuerUrlRef = useRef<HTMLInputElement | null>(null);
    const clientIdRef = useRef<HTMLInputElement | null>(null);
    const clientSecretRef = useRef<HTMLInputElement | null>(null);
    const buttonLabelRef = useRef<HTMLInputElement | null>(null);
    const requiredClaimRef = useRef<HTMLInputElement | null>(null);
    const requiredClaimValueRef = useRef<HTMLInputElement | null>(null);
    const scopesRef = useRef<HTMLInputElement | null>(null);
    const usernameClaimRef = useRef<HTMLInputElement | null>(null);
    const [hasClaimFilter, setHasClaimFilter] = useState(false);

    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        const overwrites = {
            issuerUrl: emptyToNull(issuerUrlRef.current?.value),
            clientId: emptyToNull(clientIdRef.current?.value),
            clientSecret: emptyToNull(clientSecretRef.current?.value),
            buttonLabel: buttonLabelRef.current?.value,
            requiredClaim: emptyToNull(requiredClaimRef.current?.value),
            requiredClaimValue: emptyToNull(requiredClaimValueRef.current?.value),
            scopes: scopesRef.current?.value,
            usernameClaim: usernameClaimRef.current?.value,
        };
        setHasClaimFilter(!!overwrites.requiredClaim);

        const res = getConfigDiff(cfg, states, overwrites, showAdvanced);
        pageCtx.setCardPendingSave(res.hasChanges ? cardCtx : null);
        return res;
    }

    //Validate changes (for UX only) and trigger the save API
    const handleOnSave = () => {
        const { hasChanges, localConfigs } = updatePageState();
        if (!hasChanges) return;
        const oidc = localConfigs.oidc;
        if (!oidc) return;

        if (oidc.enabled && (!oidc.issuerUrl || !oidc.clientId || !oidc.clientSecret)) {
            return txToast.error({
                title: 'Missing required fields.',
                md: true,
                msg: 'The **Issuer URL**, **Client ID** and **Client Secret** are required to enable the SSO login.',
            });
        }
        if (!oidc.requiredClaim && oidc.requiredClaimValue) {
            return txToast.error('The Required Claim Value cannot be set without a Required Claim.');
        }

        //Last chance warning for the most dangerous combination
        const privileged = Array.isArray(oidc.defaultPermissions)
            ? oidc.defaultPermissions.filter((p) => p in PRIVILEGED_PERMISSIONS)
            : [];
        if (oidc.enabled && oidc.autoCreateAccounts && privileged.length && !oidc.requiredClaim) {
            return openConfirmDialog({
                title: 'Are you sure?',
                actionLabel: 'Save anyway',
                confirmBtnVariant: 'destructive',
                message: (<>
                    New accounts will be created automatically with the privileged permission(s) <strong>{privileged.join(', ')}</strong>, and <strong>no Required Claim filter</strong> is configured. <br />
                    This means <strong>anyone</strong> able to login to your Identity Provider gets that access to txAdmin.
                </>),
                onConfirm: () => pageCtx.saveChanges(cardCtx, localConfigs),
            });
        }

        pageCtx.saveChanges(cardCtx, localConfigs);
    }

    //Permissions stuff
    const permissionsList = pageCtx.apiData?.permissionsList ?? [];
    const selectedPerms = states.defaultPermissions ?? [];
    const selectedPrivileged = selectedPerms.filter((p) => p in PRIVILEGED_PERMISSIONS);
    const setPermission = (perm: string, checked: boolean) => {
        cfg.defaultPermissions.state.set((prev?: string[]) => {
            const curr = prev ?? [];
            return checked
                ? [...new Set([...curr, perm])]
                : curr.filter((p) => p !== perm);
        });
    }
    const handlePermissionChange = (perm: string, checked: boolean) => {
        if (!checked || !(perm in PRIVILEGED_PERMISSIONS)) {
            return setPermission(perm, checked);
        }
        openConfirmDialog({
            title: 'Are you sure?',
            actionLabel: `Allow ${perm}`,
            confirmBtnVariant: 'destructive',
            message: (<>
                {PRIVILEGED_PERMISSIONS[perm]} <br /><br />
                Only use this if access to your Identity Provider is strictly limited, preferably with the <strong>Required Claim</strong> filter.
            </>),
            onConfirm: () => setPermission(perm, true),
        });
    }

    const callbackBaseUrl = window.location.origin;

    return (
        <SettingsCardShell
            cardCtx={cardCtx}
            pageCtx={pageCtx}
            onClickSave={handleOnSave}
            advancedVisible={showAdvanced}
            advancedSetter={setShowAdvanced}
        >
            <SettingItem label="SSO Login">
                <SwitchText
                    id={cfg.enabled.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    variant="checkedGreen"
                    checked={states.enabled}
                    onCheckedChange={cfg.enabled.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Allow admins to login using an OpenID Connect (OIDC) provider like Keycloak, Authentik, Authelia, Azure AD/Entra ID or Google. <br />
                    Register the following <strong>Redirect URIs</strong> in your provider: <br />
                    <InlineCode>{callbackBaseUrl}/login/oidc/callback</InlineCode> <br />
                    <InlineCode>{callbackBaseUrl}/account/oidc/callback</InlineCode>
                </SettingItemDesc>
            </SettingItem>

            <SettingItem label="Issuer URL" htmlFor={cfg.issuerUrl.eid} required={states.enabled}>
                <Input
                    id={cfg.issuerUrl.eid}
                    ref={issuerUrlRef}
                    defaultValue={cfg.issuerUrl.initialValue}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                    placeholder="https://auth.example.com/realms/myrealm"
                    autoComplete="off"
                />
                <SettingItemDesc>
                    The base URL of your provider. txAdmin will load <InlineCode>/.well-known/openid-configuration</InlineCode> from it.
                </SettingItemDesc>
            </SettingItem>

            <SettingItem label="Client ID" htmlFor={cfg.clientId.eid} required={states.enabled}>
                <Input
                    id={cfg.clientId.eid}
                    ref={clientIdRef}
                    defaultValue={cfg.clientId.initialValue}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                    placeholder="txadmin"
                    autoComplete="off"
                />
            </SettingItem>

            <SettingItem label="Client Secret" htmlFor={cfg.clientSecret.eid} required={states.enabled}>
                <Input
                    id={cfg.clientSecret.eid}
                    ref={clientSecretRef}
                    type="password"
                    defaultValue={cfg.clientSecret.initialValue}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                    autoComplete="new-password"
                />
            </SettingItem>

            <SettingItem label="Button Label" htmlFor={cfg.buttonLabel.eid}>
                <Input
                    id={cfg.buttonLabel.eid}
                    ref={buttonLabelRef}
                    defaultValue={cfg.buttonLabel.initialValue}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                    placeholder="Login with SSO"
                    maxLength={32}
                />
                <SettingItemDesc>
                    The text of the button displayed on the login page.
                </SettingItemDesc>
            </SettingItem>

            <SettingItem label="Required Claim" htmlFor={cfg.requiredClaim.eid} showOptional>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                        id={cfg.requiredClaim.eid}
                        ref={requiredClaimRef}
                        defaultValue={cfg.requiredClaim.initialValue}
                        onInput={updatePageState}
                        disabled={pageCtx.isReadOnly}
                        placeholder="claim name, eg. groups"
                        autoComplete="off"
                    />
                    <Input
                        id={cfg.requiredClaimValue.eid}
                        ref={requiredClaimValueRef}
                        defaultValue={cfg.requiredClaimValue.initialValue}
                        onInput={updatePageState}
                        disabled={pageCtx.isReadOnly}
                        placeholder="value, eg. txadmin"
                        autoComplete="off"
                    />
                </div>
                <SettingItemDesc>
                    Only allow logins from accounts that have this claim. If a value is set, the claim must be equal to (or contain, for lists) that value. <br />
                    <strong>Highly recommended</strong>, as otherwise every account in your Identity Provider can try to login.
                </SettingItemDesc>
            </SettingItem>

            <SettingItem label="Link by Username">
                <SwitchText
                    id={cfg.linkByUsername.eid}
                    checkedLabel="Enabled"
                    uncheckedLabel="Disabled"
                    checked={states.linkByUsername}
                    onCheckedChange={cfg.linkByUsername.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    On the first SSO login, link the SSO account to the existing txAdmin admin with the same username (using the <InlineCode>{states.usernameClaim ?? 'preferred_username'}</InlineCode> claim). <br />
                    The master account and admins with <InlineCode>all_permissions</InlineCode> or <InlineCode>manage.admins</InlineCode> are never linked automatically and need to link via their account settings.
                </SettingItemDesc>
                <SettingItemWarningLine visible={!!states.linkByUsername}>
                    <strong>Warning:</strong> anyone able to change their username in your Identity Provider can take over an unlinked txAdmin account with the same name. Only enable this if usernames cannot be changed by the users.
                </SettingItemWarningLine>
            </SettingItem>

            <SettingItem label="Auto Create Accounts">
                <SwitchText
                    id={cfg.autoCreateAccounts.eid}
                    checkedLabel="Yes"
                    uncheckedLabel="No"
                    checked={states.autoCreateAccounts}
                    onCheckedChange={cfg.autoCreateAccounts.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Automatically create a txAdmin admin when an unknown SSO account logs in. The new admin receives the <strong>Default Permissions</strong> below. <br />
                    When disabled, only existing admins that linked their SSO account are able to login.
                </SettingItemDesc>
                <SettingItemWarningLine visible={!!states.autoCreateAccounts && !hasClaimFilter}>
                    <strong>Warning:</strong> without a <strong>Required Claim</strong> filter, every account in your Identity Provider will get an admin account.
                </SettingItemWarningLine>
            </SettingItem>

            <SettingItem label="Default Permissions" showIf={!!states.autoCreateAccounts}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 rounded-lg border p-3">
                    {permissionsList.map(({ id, label }) => {
                        const eid = `${cfg.defaultPermissions.eid}:${id}`;
                        const isPrivileged = id in PRIVILEGED_PERMISSIONS;
                        return (
                            <div key={id} className="flex items-center gap-2">
                                <Checkbox
                                    id={eid}
                                    checked={selectedPerms.includes(id)}
                                    onCheckedChange={(val) => handlePermissionChange(id, val === true)}
                                    disabled={pageCtx.isReadOnly}
                                />
                                <label
                                    htmlFor={eid}
                                    className={isPrivileged ? 'text-sm text-destructive-inline' : 'text-sm'}
                                >
                                    {label}
                                    {isPrivileged && ' ⚠'}
                                </label>
                            </div>
                        );
                    })}
                </div>
                <SettingItemDesc>
                    Permissions given to accounts created automatically. Existing admins are not affected.
                </SettingItemDesc>
                <SettingItemWarningLine visible={selectedPrivileged.length > 0} className="text-destructive-inline opacity-100">
                    <strong>Danger:</strong> the selected privileged permission(s) <InlineCode>{selectedPrivileged.join(', ')}</InlineCode> give every auto-created account full control over txAdmin.
                </SettingItemWarningLine>
            </SettingItem>

            {showAdvanced && <AdvancedDivider />}

            <SettingItem label="Scopes" htmlFor={cfg.scopes.eid} showIf={showAdvanced}>
                <Input
                    id={cfg.scopes.eid}
                    ref={scopesRef}
                    defaultValue={cfg.scopes.initialValue}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                    placeholder="openid profile email"
                />
                <SettingItemDesc>
                    Space separated list of scopes requested from the provider. Must include <InlineCode>openid</InlineCode>. <br />
                    Add the scope your provider uses for groups/roles (eg. <InlineCode>groups</InlineCode>) if you use the Required Claim filter.
                </SettingItemDesc>
            </SettingItem>

            <SettingItem label="Username Claim" htmlFor={cfg.usernameClaim.eid} showIf={showAdvanced}>
                <Input
                    id={cfg.usernameClaim.eid}
                    ref={usernameClaimRef}
                    defaultValue={cfg.usernameClaim.initialValue}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                    placeholder="preferred_username"
                />
                <SettingItemDesc>
                    The claim used for the username of new accounts and for the Link by Username option. <br />
                    The login itself is always bound to the immutable <InlineCode>sub</InlineCode> claim.
                </SettingItemDesc>
            </SettingItem>
        </SettingsCardShell>
    )
}
