import { txToast, validToastTypes } from "@/components/TxToaster";
import { useCsrfToken, useExpireAuthData } from "@/hooks/auth";
import { msToShortDuration } from "@/lib/dateTime";
import { useEffect, useRef } from "react";

const WEBPIPE_PATH = "https://monitor/WebPipe";
const headeruserAgent = `txAdminPanel/v${window.txConsts.txaVersion} (atop FXServer/b${window.txConsts.fxsVersion})`;
const defaultHeaders = {
    'Content-Type': 'application/json; charset=UTF-8',
    'Accept': 'application/json',
}

export enum ApiTimeout {
    DEFAULT = 7_500,
    LONG = 15_000,
    REALLY_LONG = 30_000,
    REALLY_REALLY_LONG = 45_000,
}

export class BackendApiError extends Error {
    title: string;
    message: string;

    constructor(title: string, message: string) {
        super();
        this.title = title;
        this.message = message;
    }
}


/**
 * Returns a function to make authenticated fetch requests
 */
type FetcherOpts = {
    method?: 'GET' | 'POST';
    body?: any;
}

export const useAuthedFetcher = () => {
    const csrfToken = useCsrfToken();
    const expireSess = useExpireAuthData();

    return async <Resp = any>(
        fetchUrl: string,
        fetchOpts: FetcherOpts = {},
        abortController?: AbortController
    ) => {
        if (!csrfToken) throw new Error('CSRF token not set');
        //Enforce single slash at the start of the path to prevent CSRF token leak
        if (fetchUrl[0] !== '/' || fetchUrl[1] === '/') {
            throw new Error(`[useAuthedFetcher] fetchUrl MUST start with a single '/', got '${fetchUrl}'.`);
        }
        if (!window.txConsts.isWebInterface) {
            fetchUrl = WEBPIPE_PATH + fetchUrl;
        }

        fetchOpts.method ??= 'GET';
        const resp = await fetch(fetchUrl, {
            method: fetchOpts.method,
            headers: {
                ...defaultHeaders,
                'User-Agent': headeruserAgent,
                'X-TxAdmin-CsrfToken': csrfToken,
            },
            body: fetchOpts.body ? JSON.stringify(fetchOpts.body) : undefined,
            signal: abortController?.signal,
        });
        const data = await resp.json();
        if (data?.logout) {
            expireSess('useAuthedFetcher', data?.reason ?? 'unknown');
            throw new Error('Session expired');
        }
        return data as Resp;
    }
}


/**
 * Simple unauthed fetch with timeout
 */
type SimpleFetchOpts<Req = any> = FetcherOpts & {
    body?: Req,
    timeout?: number
};

export const fetchWithTimeout = async <Resp = any, Req = any>(url: string, fetchOpts: SimpleFetchOpts<Req> = {}) => {
    const method = fetchOpts.method ?? 'GET';
    const body = method === 'POST' && fetchOpts.body
        ? JSON.stringify(fetchOpts.body)
        : undefined;
    const response = await fetch(url, {
        headers: defaultHeaders,
        signal: AbortSignal.timeout(fetchOpts.timeout ?? ApiTimeout.DEFAULT),
        ...fetchOpts,
        method,
        body,
    });
    return await response.json() as Resp;
};


/**
 * Hook that provides a function to call the txAdmin API
 * This provides auto handlers for GenericApiOkResp and ApiToastResp
 */
type HookOpts = {
    //I'm pretty sure the webpipe supports only GET and POST
    method: 'GET' | 'POST';
    path: string;
    abortOnUnmount?: boolean;
    throwGenericErrors?: boolean;
}

type ApiCallOpts<RespType, ReqType> = {
    pathParams?: {
        [key: string]: string;
    };
    queryParams?: {
        [key: string]: string | number | boolean | undefined;
    };
    timeout?: ApiTimeout;
    data?: ReqType;
    toastId?: string;
    toastLoadingMessage?: string;
    genericHandler?: {
        errorTitle?: string,
        successMsg: string,
    }
    success?: (data: RespType, toastId?: string) => void;
    error?: (message: string, toastId?: string) => void;
    finally?: () => void;
}

//Just syntax sugar
const VOID = undefined as void;

export const useBackendApi = <
    RespType = any,
    ReqType = NonNullable<Object>,
>(hookOpts: HookOpts) => {
    const abortController = useRef<AbortController | undefined>(undefined);
    const currentToastId = useRef<string | undefined>(undefined);
    const authedFetcher = useAuthedFetcher();
    hookOpts.abortOnUnmount ??= false;
    useEffect(() => {
        return () => {
            if (!hookOpts.abortOnUnmount) return;
            abortController.current?.abort('unmount');
            if (currentToastId.current) {
                txToast.dismiss(currentToastId.current);
            }
        }
    }, []);

    /**
     * @returns VOID if the request was aborted or error was handled, otherwise the response data
     */
    return async (opts: ApiCallOpts<RespType, ReqType>) => {
        //The abort controller is not aborted, just forgotten
        abortController.current = new AbortController();

        //Processing URL
        let fetchUrl = hookOpts.path;
        if (opts.pathParams) {
            for (const [key, val] of Object.entries(opts.pathParams)) {
                const pattern = new RegExp(`/:${key}(/|$)`);
                const replaced = fetchUrl.replace(pattern, `/${val}$1`);
                if (replaced === fetchUrl) {
                    throw new Error(`[useBackendApi] pathParam '${key}' not found in path '${hookOpts.path}'`);
                }
                fetchUrl = replaced;
            }
        }
        if (opts.queryParams) {
            const params = new URLSearchParams();
            for (const [key, val] of Object.entries(opts.queryParams)) {
                if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                    params.append(key, val.toString());
                }
            }
            fetchUrl += `?${params.toString()}`;
        }
        const apiCallDesc = `${hookOpts.method} ${hookOpts.path}`;

        //Error handler
        const handleError = (title: string, msg: string) => {
            if (currentToastId.current) {
                txToast.error({ title, msg, }, { id: currentToastId.current });
            }
            if (opts.error) {
                try {
                    opts.error(msg, currentToastId.current);
                } catch (error) {
                    console.log('[ERROR CB ERROR]', apiCallDesc, error);
                }
            } else {
                throw new BackendApiError(title, msg);
            }
        }

        //Setting up new toast or clear any previous lingering toast
        if (opts.toastId && opts.toastLoadingMessage) {
            throw new Error(`[useBackendApi] toastId and toastLoadingMessage are mutually exclusive.`);
        } else if (opts.toastLoadingMessage) {
            currentToastId.current = txToast.loading(opts.toastLoadingMessage);
        } else if (opts.toastId) {
            currentToastId.current = opts.toastId;
        } else if (currentToastId.current) {
            txToast.dismiss(currentToastId.current);
            currentToastId.current = undefined;
        }

        //Starting request timeout
        const timeoutMs = opts.timeout ?? ApiTimeout.DEFAULT;
        const timeoutId = setTimeout(() => {
            if (abortController.current?.signal.aborted) return;
            console.log('[TIMEOUT]', apiCallDesc);
            const msg = `Request timed out after ${msToShortDuration(timeoutMs, {units: ['s', 'ms']})}.`;
            abortController.current?.abort(msg);
            handleError('Request Timeout', 'If you closed txAdmin, please restart it and try again.');
        }, timeoutMs);

        try {
            //Make request
            console.log('[>>]', apiCallDesc);
            const data = await authedFetcher(fetchUrl, {
                method: hookOpts.method,
                body: opts.data,
            }, abortController.current);
            clearTimeout(timeoutId);
            // if (abortController.current?.signal.aborted) {
            //     throw abortController.current.signal.reason;
            // };

            //If generic error
            if (hookOpts.throwGenericErrors && 'error' in data) {
                throw new BackendApiError('API Error', data.error);
            }

            //Auto handler for GenericApiErrorResp & GenericApiOkResp if genericHandler is set
            if (opts.genericHandler && currentToastId.current) {
                if ('error' in data) {
                    txToast.error({
                        title: opts.genericHandler.errorTitle,
                        msg: data.error,
                    }, { id: currentToastId.current });
                } else {
                    txToast.success(opts.genericHandler.successMsg, { id: currentToastId.current });
                }
            }

            //Auto handler for ApiToastResp
            if (
                currentToastId.current
                && typeof data?.type === 'string'
                && typeof data?.msg === 'string'
                && validToastTypes.includes(data?.type)
                && typeof txToast[data.type as keyof typeof txToast] === 'function'
            ) {
                txToast[data.type as keyof typeof txToast](data, { id: currentToastId.current });
            }

            //Custom success handler
            if (opts.success) {
                try {
                    opts.success(data, currentToastId.current);
                } catch (error) {
                    console.log('[SUCCESS CB ERROR]', apiCallDesc, error);
                }
            }
            return data as RespType;

        } catch (e) {
            // console.warn('Error Handling:', {
            //     aborted: abortController.current?.signal.aborted,
            //     reason: abortController.current?.signal.reason,
            //     typeof: typeof e,
            //     e,
            // });
            clearTimeout(timeoutId);
            if (e === 'unmount') {
                console.warn('[UNMOUNTED]', apiCallDesc);
                return VOID;
            }
            const error = abortController.current?.signal.reason ?? e as any;
            let errorMessage = 'unknown error';
            if(typeof error === 'string') {
                errorMessage = error;
            } else if (typeof error.message !== 'string') {
                errorMessage = JSON.stringify(error);
            } else if (error.message.startsWith('NetworkError')) {
                errorMessage = 'Network error.\nIf you closed txAdmin, please restart it and try again.';
            } else if (error.message.startsWith('JSON.parse:')) {
                errorMessage = 'Invalid JSON response from server.';
            } else {
                errorMessage = error.message;
            }
            
            console.error('[ERROR]', apiCallDesc, errorMessage);
            handleError('Request Error', errorMessage);
            return VOID;
        } finally {
            if (opts.finally) {
                try {
                    opts.finally();
                } catch (error) {
                    console.log('[FINALLY CB ERROR]', apiCallDesc, error);
                }
            }
        }
    }
}
