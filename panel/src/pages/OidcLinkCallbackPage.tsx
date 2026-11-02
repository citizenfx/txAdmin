import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import GenericSpinner from "@/components/GenericSpinner";
import { txToast } from "@/components/TxToaster";
import { useAuth } from "@/hooks/auth";
import { useAuthedFetcher } from "@/hooks/fetch";
import { useOpenAccountModal } from "@/hooks/dialogs";
import { useSetPageTitle } from "@/hooks/pages";
import { AuthError, processFetchError } from "@/pages/auth/errors";
import { checkOidcUrlErrors } from "@/pages/auth/OidcCallback";
import type { ApiOauthCallbackErrorResp, ApiOauthCallbackReq } from "@shared/authApiTypes";
import type { GenericApiOkResp } from "@shared/genericApiTypes";


/**
 * Handles the OIDC callback when linking the SSO account to the logged in admin
 */
export default function OidcLinkCallbackPage() {
    const hasPendingMutation = useRef(false); //due to strict mode re-rendering
    const authedFetcher = useAuthedFetcher();
    const { authData, setAuthData } = useAuth();
    const openAccountModal = useOpenAccountModal();
    const setLocation = useLocation()[1];
    const setPageTitle = useSetPageTitle();
    const [errorData, setErrorData] = useState<ApiOauthCallbackErrorResp | undefined>(checkOidcUrlErrors);
    setPageTitle('SSO Link');

    const submitCallback = async () => {
        try {
            const data = await authedFetcher<ApiOauthCallbackErrorResp | GenericApiOkResp>(
                '/auth/oidc/link/callback',
                {
                    method: 'POST',
                    body: {
                        redirectUri: window.location.href,
                    } satisfies ApiOauthCallbackReq,
                }
            );
            if ('errorCode' in data || 'errorTitle' in data) {
                setErrorData(data);
            } else if ('error' in data) {
                setErrorData({ errorTitle: 'Failed to link SSO account:', errorMessage: data.error });
            } else {
                if (authData) setAuthData({ ...authData, hasOidcLink: true });
                txToast.success('SSO account linked successfully!');
                setLocation('/');
                openAccountModal('sso');
            }
        } catch (error) {
            setErrorData(processFetchError(error));
        }
    }

    useEffect(() => {
        if (hasPendingMutation.current) return;
        hasPendingMutation.current = true;
        if (checkOidcUrlErrors()) return;
        submitCallback();
    }, []);

    return (
        <div className="w-full flex justify-center">
            <Card className="max-w-lg w-full min-h-60 flex items-center justify-center text-center">
                {errorData ? (
                    <AuthError error={{ ...errorData, returnTo: '/' }} />
                ) : (
                    <GenericSpinner msg="Linking SSO account..." />
                )}
            </Card>
        </div>
    );
}
