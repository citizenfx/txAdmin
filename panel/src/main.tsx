// Required for the core webserver integration to work
import 'vite/modulepreload-polyfill';

import { ErrorBoundary } from "react-error-boundary";
import ReactDOM from 'react-dom/client';
import './globals.css';

import MainShell from './layout/MainShell.tsx';
import { AppErrorFallback } from './components/ErrorFallback.tsx';
import { logoutWatcher, useIsAuthenticated } from './hooks/auth.ts';
import AuthShell from './layout/AuthShell.tsx';
import { isValidRedirectPath, redirectToLogin } from '@/lib/navigation';
import ThemeProvider from './components/ThemeProvider.tsx';
import { StrictMode, useEffect } from 'react';
import { isMobile } from 'is-mobile';
import { useAtomValue } from 'jotai';
import { pageTitleWatcher } from './hooks/pages.ts';


//If inside NUI, silence console.* calls to prevent confusion.
if (!window.txConsts.isWebInterface) {
    console.log = () => { };
    console.info = () => { };
    console.warn = () => { };
    console.error = () => { };
    console.debug = () => { };
    console.table = () => { };
    console.group = () => { };
    console.groupEnd = () => { };
    console.groupCollapsed = () => { };
    console.time = () => { };
    console.timeEnd = () => { };
    console.timeLog = () => { };
}

//Detecting if the user is on a mobile device
try {
    window.txIsMobile = isMobile({ tablet: true });
} catch (error) {
    window.txIsMobile = false;
}

//Detecting locale preferences
try {
    window.txBrowserLocale = window?.nuiSystemLanguages ?? navigator.language ?? 'en';
} catch (error) {
    window.txBrowserLocale = 'en';
}
try {
    const localeOption = Intl.DateTimeFormat(window.txBrowserLocale, { hour: 'numeric' }).resolvedOptions().hour12
    window.txBrowserHour12 = localeOption ?? true;
} catch (error) {
    window.txBrowserHour12 = true;
}

//If the initial routing is from WebPipe, remove it from the pathname so the router can handle it
if (window.location.pathname.substring(0, 8) === '/WebPipe') {
    console.info('Removing WebPipe prefix from the pathname.');
    const newUrl = window.location.pathname.substring(8) + window.location.search + window.location.hash;
    window.history.replaceState(null, '', newUrl);
}

// FIXME:NEXT:UPDATE - legacy /whitelist URL
if (window.location.pathname === '/whitelist') {
    window.history.replaceState(null, '', '/allowlist');
}

//Rendering auth or main pages depending on if the user is authenticated
const authRoutePrefixes = ['/login', '/addMaster'];
const isAuthRoute = (pathname: string) => {
    return authRoutePrefixes.some(prefix => pathname.startsWith(prefix));
}


export function AuthContextSwitch() {
    useAtomValue(logoutWatcher);
    useAtomValue(pageTitleWatcher);
    const isAuthenticated = useIsAuthenticated();

    useEffect(() => {
        if (isAuthenticated) {
            //Replace the current URL with the redirect path if it exists and is valid
            const urlParams = new URLSearchParams(window.location.search);
            const redirectPath = urlParams.get('r');
            if (redirectPath) {
                if (isValidRedirectPath(redirectPath)) {
                    window.history.replaceState(null, '', redirectPath);
                } else {
                    window.history.replaceState(null, '', '/');
                }
            } else if (isAuthRoute(window.location.pathname)) {
                window.history.replaceState(null, '', '/');
            }
        } else {
            //Unless the user is already in the auth pages, redirect to the login page
            if (!window.txConsts.hasMasterAccount && !window.location.pathname.startsWith('/addMaster')) {
                console.log('No master account detected. Redirecting to addMaster page.');
                window.history.replaceState(null, '', '/addMaster/pin');
            } else if (!isAuthRoute(window.location.pathname)) {
                console.log('User is not authenticated. Redirecting to login page.');
                redirectToLogin();
            }
        }
    }, [isAuthenticated]);

    return isAuthenticated ? <MainShell /> : <AuthShell />;
}


ReactDOM.createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ErrorBoundary FallbackComponent={AppErrorFallback}>
            <ThemeProvider>
                <AuthContextSwitch />
            </ThemeProvider>
        </ErrorBoundary>
    </StrictMode>,
)
