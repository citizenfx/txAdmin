import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent, DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/auth";
import { useEffect, useState } from "react";
import { TabsTrigger, TabsList, TabsContent, Tabs } from "@/components/ui/tabs";
import { ApiChangeIdentifiersReq, ApiChangePasswordReq, ApiOauthRedirectResp, ApiOidcLinkStatusResp } from "@shared/authApiTypes";
import { useAccountModal, useCloseAccountModal } from "@/hooks/dialogs";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import { fetchWithTimeout, useAuthedFetcher, useBackendApi } from "@/hooks/fetch";
import consts from "@shared/consts";
import { txToast } from "@/components/TxToaster";
import useSWR from 'swr';
import TxAnchor from "@/components/TxAnchor";


/**
 * Change Password tab
 */
function ChangePasswordTab() {
    const { authData, setAuthData } = useAuth();
    const { setAccountModalTab } = useAccountModal();
    const closeAccountModal = useCloseAccountModal();
    const changePasswordApi = useBackendApi<GenericApiOkResp, ApiChangePasswordReq>({
        method: 'POST',
        path: '/auth/changePassword'
    });
    const skipOldPassword = authData && (authData.isTempPassword || authData.hasSsoGeneratedPassword);

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        if (!authData) return;
        setError('');

        if (newPassword.length < consts.adminPasswordMinLength || newPassword.length > consts.adminPasswordMaxLength) {
            setError(`The password must be between ${consts.adminPasswordMinLength} and ${consts.adminPasswordMaxLength} digits long.`);
            return;
        } else if (newPassword !== newPasswordConfirm) {
            setError('The passwords do not match.');
            return;
        }

        setIsSaving(true);
        changePasswordApi({
            data: {
                newPassword,
                oldPassword: skipOldPassword ? undefined : oldPassword,
            },
            error: (error) => {
                setIsSaving(false);
                setError(error);
            },
            success: (data) => {
                setIsSaving(false);
                if ('success' in data) {
                    if (authData.isTempPassword) {
                        setAccountModalTab('identifiers');
                        setAuthData({
                            ...authData,
                            isTempPassword: false,
                        });
                    } else {
                        txToast.success('Password changed successfully!');
                        if (authData.hasSsoGeneratedPassword) {
                            setAuthData({
                                ...authData,
                                hasSsoGeneratedPassword: false,
                            });
                        }
                        closeAccountModal();
                    }
                } else {
                    setError(data.error)
                }
            }
        });
    };

    if (!authData) return;
    return (
        <TabsContent value="password" tabIndex={undefined}>
            <form onSubmit={handleSubmit}>
                {authData.isTempPassword ? (<p className="text-sm text-warning-inline">
                    Your account has a temporary password that needs to be changed before you can use this web panel. <br />
                    <strong>Make sure to take note of your new password before saving.</strong>
                </p>) : authData.hasSsoGeneratedPassword ? (<p className="text-sm text-muted-foreground">
                    Your account was created via SSO and has no password yet. <br />
                    You can set one to be able to login without SSO.
                </p>) : (<p className="text-sm text-muted-foreground">
                    You can use your password to login to the txAdmin inferface even without using the Cfx.re login button.
                </p>)}
                <div className="space-y-3 pt-2 pb-6">
                    {!skipOldPassword && (
                        <div className="space-y-1">
                            <Label htmlFor="current-password">Current Password</Label>
                            <Input
                                id="current-password"
                                placeholder="Enter current password"
                                type="password"
                                value={oldPassword}
                                autoFocus
                                required
                                onChange={(e) => {
                                    setOldPassword(e.target.value);
                                    setError('');
                                }}
                            />
                        </div>
                    )}
                    <div className="space-y-1">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                            id="new-password"
                            autoComplete="new-password"
                            placeholder="Enter new password"
                            type="password"
                            value={newPassword}
                            autoFocus={authData.isTempPassword}
                            required
                            onChange={(e) => {
                                setNewPassword(e.target.value);
                                setError('');
                            }}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                            id="confirm-password"
                            autoComplete="new-password"
                            placeholder="Repeat new password"
                            type="password"
                            required
                            onChange={(e) => {
                                setNewPasswordConfirm(e.target.value);
                                setError('');
                            }}
                        />
                    </div>
                </div>

                {error && <p className="text-destructive text-center -mt-2 mb-4">{error}</p>}
                <Button
                    className="w-full"
                    type="submit"
                    disabled={isSaving}
                >
                    {isSaving ? 'Saving...' : authData.isTempPassword ? 'Save & Next' : 'Change Password'}
                </Button>
            </form>
        </TabsContent>
    );
}


/**
 * Change Identifiers tab
 */
function ChangeIdentifiersTab() {
    const authedFetcher = useAuthedFetcher();
    const [cfxreId, setCfxreId] = useState('');
    const [discordId, setDiscordId] = useState('');
    const [error, setError] = useState('');
    const [isConvertingFivemId, setIsConvertingFivemId] = useState(false);
    const closeAccountModal = useCloseAccountModal();
    const [isSaving, setIsSaving] = useState(false);

    const currIdsResp = useSWR<ApiChangeIdentifiersReq>(
        '/auth/getIdentifiers',
        () => authedFetcher<ApiChangeIdentifiersReq>('/auth/getIdentifiers'),
        {
            //the data min interval is 5 mins, so we can safely cache for 1 min
            revalidateOnMount: true,
            revalidateOnFocus: false,
        }
    );

    useEffect(() => {
        if (!currIdsResp.data) return;
        setCfxreId(currIdsResp.data.cfxreId);
        setDiscordId(currIdsResp.data.discordId);
    }, [currIdsResp.data]);

    useEffect(() => {
        setError(currIdsResp.error?.message ?? '');
    }, [currIdsResp.error]);

    const changeIdentifiersApi = useBackendApi<GenericApiOkResp, ApiChangeIdentifiersReq>({
        method: 'POST',
        path: '/auth/changeIdentifiers'
    });

    const handleSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        setError('');
        setIsSaving(true);
        changeIdentifiersApi({
            data: { cfxreId, discordId },
            error: (error) => {
                setError(error);
            },
            success: (data) => {
                setIsSaving(false);
                if ('success' in data) {
                    txToast.success('Identifiers changed successfully!');
                    closeAccountModal();
                } else {
                    setError(data.error)
                }
            }
        });
    };

    const handleCfxreIdBlur = async () => {
        if (!cfxreId) return;
        const trimmed = cfxreId.trim();
        if (/^\d+$/.test(trimmed)) {
            setCfxreId(`fivem:${trimmed}`);
        } else if (!trimmed.startsWith('fivem:')) {
            try {
                setIsConvertingFivemId(true);
                const forumData = await fetchWithTimeout(`https://forum.cfx.re/u/${trimmed}.json`);
                if (forumData.user && typeof forumData.user.id === 'number') {
                    setCfxreId(`fivem:${forumData.user.id}`);
                } else {
                    setError('Could not find the user in the forum. Make sure you typed the username correctly.');
                }
            } catch (error) {
                setError('Failed to check the identifiers on the forum API.');
            }
            setIsConvertingFivemId(false);
        } else if (cfxreId !== trimmed) {
            setCfxreId(trimmed);
        }
    }

    const handleDiscordIdBlur = () => {
        if (!discordId) return;
        const trimmed = discordId.trim();
        if (/^\d+$/.test(trimmed)) {
            setDiscordId(`discord:${trimmed}`);
        } else if (discordId !== trimmed) {
            setDiscordId(trimmed);
        }
    }

    return (
        <TabsContent value="identifiers" tabIndex={undefined}>
            <form onSubmit={handleSubmit}>
                <p className="text-sm text-muted-foreground">
                    The identifiers are optional for accessing the <strong>Web Panel</strong> but required for you to be able to use the <strong>In Game Menu</strong> and the <strong>Discord Bot</strong>. <br />
                    <strong>It is recommended that you configure at least one.</strong>
                </p>
                <div className="space-y-3 pt-2 pb-6">
                    <div className="space-y-1">
                        <Label htmlFor="cfxreId">FiveM identifier <span className="text-sm opacity-75 text-info">(optional)</span></Label>
                        <Input
                            id="cfxreId"
                            autoCapitalize="none"
                            autoComplete="off"
                            autoCorrect="off"
                            placeholder="fivem:000000"
                            value={currIdsResp.isLoading || isConvertingFivemId ? 'loading...' : cfxreId}
                            disabled={currIdsResp.isLoading || isConvertingFivemId}
                            autoFocus
                            onBlur={handleCfxreIdBlur}
                            onChange={(e) => {
                                setCfxreId(e.target.value);
                                setError('');
                            }}
                        />
                        <p className="text-sm text-muted-foreground">
                            Your identifier can be found by clicking at your name in the playerlist and going to the IDs page. 
                            You can also type in your <TxAnchor href="https://forum.cfx.re/">forum.cfx.re</TxAnchor> username and it will be converted automatically. <br />
                            This is required if you want to login using the Cfx.re button.
                        </p>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="discordId">Discord identifier <span className="text-sm opacity-75 text-info">(optional)</span></Label>
                        <Input
                            id="discordId"
                            autoCapitalize="none"
                            autoComplete="off"
                            autoCorrect="off"
                            placeholder="discord:000000000000000000"
                            value={currIdsResp.isLoading ? 'loading...' : discordId}
                            disabled={currIdsResp.isLoading}
                            onBlur={handleDiscordIdBlur}
                            onChange={(e) => {
                                setDiscordId(e.target.value);
                                setError('');
                            }}
                        />
                        <p className="text-sm text-muted-foreground">
                            You can get your Discord User ID by following <TxAnchor href="https://support.discordapp.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID">this guide</TxAnchor>. <br />
                            This is required if you want to use the Discord Bot slash commands.
                        </p>
                    </div>
                </div>

                {error && <p className="text-destructive text-center -mt-2 mb-4">{error}</p>}
                <Button
                    className="w-full"
                    type="submit"
                    disabled={!currIdsResp || isSaving}
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </form>
        </TabsContent>
    );
}


/**
 * SSO (OIDC) link tab
 */
function SsoLinkTab() {
    const authedFetcher = useAuthedFetcher();
    const { authData, setAuthData } = useAuth();
    const [error, setError] = useState('');
    const [isBusy, setIsBusy] = useState(false);
    const [confirmUnlink, setConfirmUnlink] = useState(false);

    const statusResp = useSWR<ApiOidcLinkStatusResp>(
        '/auth/oidc/link',
        () => authedFetcher<ApiOidcLinkStatusResp>('/auth/oidc/link'),
        {
            revalidateOnMount: true,
            revalidateOnFocus: false,
        }
    );

    const unlinkApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: '/auth/oidc/unlink'
    });

    const handleLink = async () => {
        setError('');
        setIsBusy(true);
        try {
            const data = await authedFetcher<ApiOauthRedirectResp>(
                `/auth/oidc/link/redirect?origin=${encodeURIComponent(window.location.origin)}`
            );
            if ('error' in data) {
                setError(data.error);
                setIsBusy(false);
            } else {
                window.location.href = data.authUrl;
            }
        } catch (error) {
            setError((error as Error).message);
            setIsBusy(false);
        }
    }

    const handleUnlink = () => {
        if (!confirmUnlink) {
            setConfirmUnlink(true);
            return;
        }
        setError('');
        setIsBusy(true);
        unlinkApi({
            data: {},
            error: (error) => {
                setIsBusy(false);
                setError(error);
            },
            success: (data) => {
                setIsBusy(false);
                setConfirmUnlink(false);
                if ('success' in data) {
                    txToast.success('SSO account unlinked.');
                    if (authData) setAuthData({ ...authData, hasOidcLink: false });
                    statusResp.mutate();
                } else {
                    setError(data.error);
                }
            }
        });
    }

    const status = statusResp.data;
    return (
        <TabsContent value="sso" tabIndex={undefined}>
            <p className="text-sm text-muted-foreground">
                Link your account to the Single Sign-On (SSO) provider configured for this server, so you can login using the <strong>{window.txConsts.oidc?.buttonLabel ?? 'SSO'}</strong> button.
            </p>
            <div className="py-6 text-center">
                {statusResp.isLoading ? (
                    <span className="text-muted-foreground">loading...</span>
                ) : status?.linked ? (
                    <div className="space-y-1">
                        <div className="text-success-inline font-semibold">Linked</div>
                        {(status.username || status.email) && (
                            <div className="text-sm">{status.username ?? status.email}</div>
                        )}
                        {status.linkedAt && (
                            <div className="text-xs text-muted-foreground">
                                since {new Date(status.linkedAt).toLocaleString()}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-muted-foreground">Not linked</div>
                )}
            </div>

            {confirmUnlink && (
                <p className="text-sm text-warning-inline text-center mb-4">
                    You will not be able to login via SSO anymore. If you are currently logged in via SSO, you will be logged out. <br />
                    Click again to confirm.
                </p>
            )}
            {error && <p className="text-destructive text-center mb-4">{error}</p>}

            {status && !status.enabled && !status.linked ? (
                <p className="text-sm text-center text-muted-foreground">SSO login is not enabled on this server.</p>
            ) : status?.linked ? (
                <Button
                    className="w-full"
                    variant={confirmUnlink ? 'destructive' : 'outline'}
                    disabled={isBusy}
                    onClick={handleUnlink}
                >
                    {isBusy ? 'Unlinking...' : confirmUnlink ? 'Confirm Unlink' : 'Unlink SSO Account'}
                </Button>
            ) : (
                <Button
                    className="w-full"
                    disabled={isBusy || !status}
                    onClick={handleLink}
                >
                    {isBusy ? 'Redirecting...' : 'Link SSO Account'}
                </Button>
            )}
        </TabsContent>
    );
}


/**
 * Account Dialog
 */
export default function AccountDialog() {
    const { authData } = useAuth();
    const {
        isAccountModalOpen, setAccountModalOpen,
        accountModalTab, setAccountModalTab
    } = useAccountModal();

    useEffect(() => {
        if (!authData) return;
        if (authData.isTempPassword) {
            setAccountModalOpen(true);
            setAccountModalTab('password');
        }
    }, []);

    const dialogSetIsClose = (newState: boolean) => {
        if (!newState && authData && !authData.isTempPassword) {
            setAccountModalOpen(false);
            setTimeout(() => {
                setAccountModalTab('password');
            }, 500);
        }
    }

    if (!authData) return;
    //NOTE: the OIDC redirects don't work inside the NUI
    const showSsoTab = window.txConsts.isWebInterface && (window.txConsts.oidc?.enabled || authData.hasOidcLink);
    return (
        <Dialog
            open={isAccountModalOpen}
            onOpenChange={dialogSetIsClose}
        >
            <DialogContent className="sm:max-w-lg" tabIndex={undefined}>
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                        {authData.isTempPassword ? 'Welcome to txAdmin!' : `Your Account - ${authData.name}`}
                    </DialogTitle>
                </DialogHeader>
                <Tabs
                    defaultValue="password"
                    value={accountModalTab}
                    onValueChange={setAccountModalTab}
                >
                    <TabsList className={`grid w-full mb-4 ${showSsoTab ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        <TabsTrigger value="password">Password</TabsTrigger>
                        <TabsTrigger value="identifiers" disabled={authData.isTempPassword}>Identifiers</TabsTrigger>
                        {showSsoTab && (
                            <TabsTrigger value="sso" disabled={authData.isTempPassword}>SSO</TabsTrigger>
                        )}
                    </TabsList>
                    <ChangePasswordTab />
                    <ChangeIdentifiersTab />
                    {showSsoTab && <SsoLinkTab />}
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
