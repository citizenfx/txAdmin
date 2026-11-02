import { UserInfoType } from "@modules/AdminStore/providers/CitizenFX";
import type { CfxreSessAuthType, OidcSessAuthType, PassSessAuthType } from "../authLogic";
import { LRUCacheWithDelete } from "mnemonist";
import { RawKoaCtx } from "../ctxTypes";
import { Next } from "koa";
import { randomUUID } from 'node:crypto';
import { Socket } from "socket.io";
import { parse as cookieParse } from 'cookie';
import { SetOption as KoaCookieSetOption } from "cookies";
import type { DeepReadonly } from 'utility-types';

//Types
export type ValidSessionType = {
    auth?: PassSessAuthType | CfxreSessAuthType | OidcSessAuthType;
    tmpOauthLoginStateKern?: string; //uuid v4
    tmpOauthLoginCallbackUri?: string; //the URI provided to the IDMS as a callback
    tmpAddMasterUserInfo?: UserInfoType;
    tmpOidcAuth?: {
        purpose: 'login' | 'link';
        redirectUri: string;
        state: string;
        nonce: string;
        codeVerifier: string;
    };
}
export type SessToolsType = {
    get: () => DeepReadonly<ValidSessionType> | undefined;
    set: (sess: ValidSessionType) => void;
    destroy: () => void;
}
type StoredSessionType = {
    expires: number;
    data: ValidSessionType;
}

/**
 * Storage for the sessions
 */
export class SessionMemoryStorage {
    private readonly sessions = new LRUCacheWithDelete<string, StoredSessionType>(5000);
    public readonly maxAgeMs = 24 * 60 * 60 * 1000;

    constructor(maxAgeMs?: number) {
        if (maxAgeMs) {
            this.maxAgeMs = maxAgeMs;
        }

        //Cleanup every 5 mins
        setInterval(() => {
            const now = Date.now();
            for (const [key, sess] of this.sessions) {
                if (sess.expires < now) {
                    this.sessions.delete(key);
                }
            }
        }, 5 * 60_000);
    }

    get(key: string) {
        const stored = this.sessions.get(key);
        if (!stored) return;
        if (stored.expires < Date.now()) {
            this.sessions.delete(key);
            return;
        }
        return stored.data as DeepReadonly<ValidSessionType>;
    }

    set(key: string, sess: ValidSessionType) {
        this.sessions.set(key, {
            expires: Date.now() + this.maxAgeMs,
            data: sess,
        });
    }

    refresh(key: string) {
        const stored = this.sessions.get(key);
        if (!stored) return;
        this.sessions.set(key, {
            expires: Date.now() + this.maxAgeMs,
            data: stored.data,
        });
    }

    destroy(key: string) {
        return this.sessions.delete(key);
    }

    get size() {
        return this.sessions.size;
    }
}


/**
 * Helper to check if the session id is valid
 */
const isValidSessId = (sessId: string) => {
    if (typeof sessId !== 'string') return false;
    if (sessId.length !== 36) return false;
    return true;
}


/**
 * Middleware factory to add sessTools to the koa context.
 */
export const koaSessMw = (cookieName: string, store: SessionMemoryStorage) => {
    const cookieOptions = {
        path: '/',
        maxAge: store.maxAgeMs,
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        overwrite: true,
        signed: false,

    } as KoaCookieSetOption;

    //Middleware
    return (ctx: RawKoaCtx, next: Next) => {
        const sessGet = () => {
            const sessId = ctx.cookies.get(cookieName);
            if (!sessId || !isValidSessId(sessId)) return;
            const stored = store.get(sessId);
            if (!stored) return;
            ctx._refreshSessionCookieId = sessId;
            return stored;
        }

        const sessSet = (sess: ValidSessionType) => {
            const sessId = ctx.cookies.get(cookieName);
            if (!sessId || !isValidSessId(sessId)) {
                const newSessId = randomUUID();
                ctx.cookies.set(cookieName, newSessId, cookieOptions);
                store.set(newSessId, sess);
            } else {
                store.set(sessId, sess);
            }
        }

        const sessDestroy = () => {
            const sessId = ctx.cookies.get(cookieName);
            if (!sessId || !isValidSessId(sessId)) return;
            store.destroy(sessId);
            ctx.cookies.set(cookieName, 'unset', cookieOptions);
        }

        ctx.sessTools = {
            get: sessGet,
            set: sessSet,
            destroy: sessDestroy,
        } satisfies SessToolsType;

        try {
            return next();
        } catch (error) {
            throw error;
        } finally {
            if (typeof ctx._refreshSessionCookieId === 'string') {
                ctx.cookies.set(cookieName, ctx._refreshSessionCookieId, cookieOptions);
                store.refresh(ctx._refreshSessionCookieId);
            }
        }
    }
}


/**
 * Middleware factory to add sessTools to the socket context.
 * 
 * NOTE: The set() and destroy() functions are NO-OPs because we cannot set cookies in socket.io,
 *  but that's fine since socket pages are always acompanied by a web page
 *  the authLogic only needs to get the cookie, and the webAuthMw only destroys it
 *  and webSocket.handleConnection() just drops if authLogic fails.
 */
export const socketioSessMw = (cookieName: string, store: SessionMemoryStorage) => {
    return async (socket: Socket & { sessTools?: SessToolsType }, next: Function) => {
        const sessGet = () => {
            const cookiesString = socket?.handshake?.headers?.cookie;
            if (typeof cookiesString !== 'string') return;
            const cookies = cookieParse(cookiesString);
            const sessId = cookies[cookieName];
            if (!sessId || !isValidSessId(sessId)) return;
            return store.get(sessId);
        }

        socket.sessTools = {
            get: sessGet,
            set: (sess: ValidSessionType) => { },
            destroy: () => { },
        } satisfies SessToolsType;

        return next();
    }
}
