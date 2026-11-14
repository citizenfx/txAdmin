import { useAuth } from "@/hooks/auth";
import { ApiOauthCallbackErrorResp, ApiOauthCallbackReq, ApiOauthCallbackResp } from "@shared/authApiTypes";
import { useEffect, useRef, useState } from "react";
import { AuthError, processFetchError } from "./errors";
import GenericSpinner from "@/components/GenericSpinner";
import { fetchWithTimeout } from "@/hooks/fetch";


/**
 * Checks the URL search params for errors returned by the OIDC provider.
 */
export const checkOidcUrlErrors = (): ApiOauthCallbackErrorResp | undefined => {
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error');
    if (!errorCode) return;
    if (errorCode === 'access_denied') {
        return { errorCode: 'end_user_aborted' };
    }
    return {
        errorTitle: `SSO Provider Error: ${errorCode}`,
        errorMessage: params.get('error_description') ?? 'No description provided.',
    };
}


export default function OidcCallback() {
    const hasPendingMutation = useRef(false); //due to strict mode re-rendering
    const { authData, setAuthData } = useAuth();
    const [errorData, setErrorData] = useState<ApiOauthCallbackErrorResp | undefined>(checkOidcUrlErrors);
    const [isFetching, setIsFetching] = useState(false);

    const submitCallback = async () => {
        try {
            setIsFetching(true);
            const data = await fetchWithTimeout<ApiOauthCallbackResp, ApiOauthCallbackReq>(
                `/auth/oidc/callback`,
                {
                    method: 'POST',
                    body: {
                        redirectUri: window.location.href
                    },
                }
            );
            if ('errorCode' in data || 'errorTitle' in data) {
                setErrorData(data);
            } else {
                setAuthData(data);
            }
        } catch (error) {
            setErrorData(processFetchError(error));
        } finally {
            setIsFetching(false);
        }
    }

    useEffect(() => {
        if (authData || hasPendingMutation.current) return;
        hasPendingMutation.current = true;
        if (checkOidcUrlErrors()) return;
        submitCallback();
    }, []);

    if (errorData) {
        return <AuthError error={errorData} />;
    } else if (isFetching) {
        return <GenericSpinner msg="Logging in..." />;
    } else {
        return <GenericSpinner />;
    }
}
