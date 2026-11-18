import InlineCode from "@/components/InlineCode";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { ApiOauthCallbackErrorResp } from "@shared/authApiTypes";
import { ArrowLeftIcon } from "lucide-react";
import { Link } from "wouter";


//Shortcut component
function ErrorText({ children }: { children: React.ReactNode }) {
    return (
        <p className="whitespace-pre-wrap text-secondary-foreground leading-relaxed pb-2">
            {children}
        </p>
    );
};

export type AuthErrorData = ApiOauthCallbackErrorResp & { returnTo?: string };
type AuthErrorProps = {
    error: AuthErrorData;
};


/**
 * Display OAuth errors in a user-friendly way.
 */
export function AuthError({ error }: AuthErrorProps) {
    error.returnTo = error.returnTo ?? '/login';
    let titleNode: React.ReactNode = null;
    let bodyNode: React.ReactNode = null;
    if ('errorTitle' in error) {
        titleNode = error.errorTitle
        bodyNode = <ErrorText>{error.errorMessage}</ErrorText>;
    } else if (error.errorCode === 'invalid_session') {
        titleNode = 'Invalid Browser Session.';
        bodyNode = <ErrorText>
            You may have restarted txAdmin right before entering this page. <br />
            Please return and try again.
        </ErrorText>
    } else if (error.errorCode === 'clock_desync') {
        titleNode = 'Please Update/Synchronize your VPS clock.';
        bodyNode = <ErrorText>
            Failed to login because this host's time is wrong. Please make sure to synchronize it with the internet.
        </ErrorText>
    } else if (error.errorCode === 'timeout') {
        titleNode = 'Connection to FiveM servers timed out.';
        bodyNode = <ErrorText>
            Please try again or login using your existing username and backup password.
        </ErrorText>
    } else if (error.errorCode === 'end_user_aborted') {
        titleNode = 'Login Aborted';
        bodyNode = <ErrorText>
            The Cfx.re login process was aborted. <br />
            Return to the login page to try again.
        </ErrorText>
    } else if (error.errorCode === 'end_user_logout') {
        titleNode = 'Login Aborted';
        bodyNode = <ErrorText>
            The Cfx.re login process was aborted because you logged out of the Cfx.re account. <br />
            Return to the login page to try again.
        </ErrorText>
    } else if (error.errorCode === 'master_already_set') {
        titleNode = 'Master Account Already Set';
        bodyNode = <ErrorText>
            Please go back to the login page to continue. <br />
        </ErrorText>
    } else if (error.errorCode === 'not_admin') {
        const fivemId = error.errorContext?.identifier ?? 'unknown';
        const fivemName = error.errorContext?.name ?? 'unknown';
        titleNode = `The Cfx.re account '${fivemName}' is not an admin.`;
        bodyNode = <ErrorText>
            The account above with identifier <InlineCode>{fivemId}</InlineCode> is not assigned to any account registered on txAdmin. <br />
            You can also try to login using your username and backup password.
        </ErrorText>
    } else {
        titleNode = 'Unknown Error:';
        bodyNode = <div className="text-left rounded-sm text-muted-foreground bg-muted p-1">
            <pre className="text-left whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
        </div>
    }

    return (
        <div className="p-4">
            <h3 className="text-2xl font-bold text-destructive-inline mb-4">
                {titleNode}
            </h3>
            {bodyNode}
            <CardFooter className="w-full flex justify-center mt-4 pb-0">
                <Link href={error.returnTo} asChild>
                    <Button className="x">
                        <ArrowLeftIcon className="inline mr-2 h-4 w-4" />
                        Try Again
                    </Button>
                </Link>
            </CardFooter>
        </div>
    )
}


/**
 * Check the URL search params for common OAuth errors and return them.
 */
export const checkCommonOauthErrors = () => {
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error');
    const errorDescription = params.get('error_description');
    if (errorCode === 'access_denied' && errorDescription === 'End-User aborted interaction') {
        return { errorCode: 'end_user_aborted' };
    } else if (errorCode === 'access_denied' && errorDescription === 'End-User aborted interaction (logout)') {
        return { errorCode: 'end_user_logout' };
    }
}


/**
 * Process fetch errors and return a common error object.
 */
export const processFetchError = (error: any) => {
    if (error.message?.startsWith('NetworkError')) {
        return {
            errorTitle: 'Network Error',
            errorMessage: 'If you closed txAdmin, please restart it and try again.',
        };
    } else if(error.message?.startsWith('AbortSignal.timeout')) {
        return {
            errorTitle: 'Browser Outdated',
            errorMessage: 'The version of this browser is too old to use txAdmin. Please download a new version of Edge, Chrome, Firefox, etc. and try again.',
        };
    } else {
        return {
            errorTitle: 'Unknown Error',
            errorMessage: error.message ?? '😵',
        };
    }
}
