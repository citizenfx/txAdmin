const modulename = 'WebServer';
import crypto from 'node:crypto';
import path from 'node:path';
import HttpClass from 'node:http';

import Koa from 'koa';
import KoaBodyParser from 'koa-bodyparser';
import KoaCors from '@koa/cors';

import { Server as SocketIO } from 'socket.io';
import WebSocket from './webSocket';

import { customAlphabet } from 'nanoid';
import dict49 from 'nanoid-dictionary/nolookalikes';

import { txDevEnv, txEnv, txHostConfig } from '@core/globalData';
import router from './router';
import consoleFactory from '@lib/console';
import topLevelMw from './middlewares/topLevelMw';
import ctxVarsMw from './middlewares/ctxVarsMw';
import ctxUtilsMw from './middlewares/ctxUtilsMw';
import { SessionMemoryStorage, koaSessMw, socketioSessMw } from './middlewares/sessionMws';
import checkRateLimit from './middlewares/globalRateLimiter';
import checkHttpLoad from './middlewares/httpLoadMonitor';
import cacheControlMw from './middlewares/cacheControlMw';
import fatalError from '@lib/fatalError';
import { isProxy } from 'node:util/types';
import serveStaticMw from './middlewares/serveStaticMw';
import serveRuntimeMw from './middlewares/serveRuntimeMw';
import consts from '@shared/consts';
const console = consoleFactory(modulename);
const nanoid = customAlphabet(dict49, 32);


/**
 * Module for the web server and socket.io.
 * It defines behaviors through middlewares, and instantiates the Koa app and the SocketIO server.
 */
export default class WebServer {
    public isListening = false;
    public isServing = false;
    private sessionCookieName: string;
    public luaComToken: string;
    //setupKoa
    private app: Koa;
    public sessionStore: SessionMemoryStorage;
    private koaCallback: (req: any, res: any) => Promise<void>;
    //setupWebSocket
    private io: SocketIO;
    public webSocket: WebSocket;
    //setupServerCallbacks
    private httpServer?: HttpClass.Server;

    constructor() {
        //Generate cookie key & luaComToken
        const pathHash = crypto.createHash('shake256', { outputLength: 6 })
            .update(txEnv.profilePath)
            .digest('hex')
            .padStart(12, '0');
        this.sessionCookieName = `${consts.cookies.session}:${pathHash}`;
        this.luaComToken = nanoid();


        // ===================
        // Setting up Koa
        // ===================
        this.app = new Koa();

        // Some people might want to enable it, but we are not guaranteeing XFF security
        // due to the many possible ways you can connect to koa.
        // this.app.proxy = true;

        //Setting up app
        //@ts-ignore: no clue what this error is, but i'd bet it's just bad koa types
        this.app.on('error', (error, ctx) => {
            if (!(
                error.code?.startsWith('HPE_')
                || error.code?.startsWith('ECONN')
                || error.code === 'EPIPE'
                || error.code === 'ECANCELED'
            )) {
                console.error(`Probably harmless error on ${ctx.path}`);
                console.dir(error);
            }
        });

        //Disable CORS on dev mode
        if (txDevEnv.ENABLED) {
            this.app.use(KoaCors());
        }

        //Setting up timeout/error/no-output/413
        this.app.use(topLevelMw);

        //Setting up additional middlewares:
        this.app.use(serveRuntimeMw);
        this.app.use(serveStaticMw({
            noCaching: txDevEnv.ENABLED,
            cacheMaxAge: 30 * 60, //30 minutes
            //Scan Limits: (v8-dev prod build: 56 files, 11.25MB)
            limits: {
                MAX_BYTES: 75 * 1024 * 1024, //75MB
                MAX_FILES: 300,
                MAX_DEPTH: 10,
                MAX_TIME: 2 * 60 * 1000, //2 minutes
            },
            roots: [
                txDevEnv.ENABLED
                    ? path.join(txDevEnv.SRC_PATH, 'panel/public')
                    : path.join(txEnv.txaPath, 'panel'),
                path.join(txEnv.txaPath, 'web/public'),
            ],
            onReady: () => {
                this.isServing = true;
            },
        }));

        this.app.use(KoaBodyParser({
            // Heavy bodies can cause v8 mem exhaustion during a POST DDoS.
            // The heaviest JSON is the /intercom/resources endpoint.
            // Conservative estimate: 768kb/300b = 2621 resources
            jsonLimit: '768kb',
        }));

        //Custom stuff
        this.sessionStore = new SessionMemoryStorage();
        this.app.use(cacheControlMw);
        this.app.use(koaSessMw(this.sessionCookieName, this.sessionStore));
        this.app.use(ctxVarsMw);
        this.app.use(ctxUtilsMw);

        //Setting up routes
        const txRouter = router();
        this.app.use(txRouter.routes());
        this.app.use(txRouter.allowedMethods());
        this.app.use(async (ctx) => {
            if (typeof ctx._matchedRoute === 'undefined') {
                if (ctx.path.startsWith('/legacy')) {
                    ctx.status = 404;
                    console.verbose.warn(`Request 404 error: ${ctx.path}`);
                    return ctx.send('Not found.');
                } else if (ctx.path.endsWith('.map')) {
                    ctx.status = 404;
                    return ctx.send('Not found.');
                } else {
                    return ctx.utils.serveReactIndex();
                }
            }
        });
        this.koaCallback = this.app.callback();


        // ===================
        // Setting up SocketIO
        // ===================
        this.io = new SocketIO(HttpClass.createServer(), { serveClient: false });
        this.io.use(socketioSessMw(this.sessionCookieName, this.sessionStore));
        this.webSocket = new WebSocket(this.io);
        //@ts-ignore
        this.io.on('connection', this.webSocket.handleConnection.bind(this.webSocket));


        // ===================
        // Setting up Callbacks
        // ===================
        this.setupServerCallbacks();
    }


    /**
     * Handler for all HTTP requests
     * Note: i gave up on typing these
     */
    httpCallbackHandler(req: any, res: any) {
        //Calls the appropriate callback
        try {
            // console.debug(`HTTP ${req.method} ${req.url}`);
            if (!checkHttpLoad()) return;
            if (!checkRateLimit(req?.socket?.remoteAddress)) return;

            // FIXME:NEXT:UPDATE: CVE-2026-111497 Mitigation
            // Reject inbound encoded bodies before Koa/Socket.IO decodes them.
            const contentEncoding = req.headers['content-encoding'];
            if (contentEncoding !== undefined) {
                if (typeof contentEncoding !== 'string' || contentEncoding.trim().toLowerCase() !== 'identity') {
                    res.writeHead(415, {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Accept-Encoding': 'identity',
                    });
                    res.end('Unsupported Content-Encoding');
                    return;
                }
                // Downstream parsers must also recognize case/whitespace variants.
                req.headers['content-encoding'] = 'identity';
            }

            if (req.url.startsWith('/socket.io')) {
                (this.io.engine as any).handleRequest(req, res);
            } else {
                this.koaCallback(req, res);
            }
        } catch (error) { }
    }


    /**
     * Setup the HTTP server callbacks
     */
    setupServerCallbacks() {
        //Just in case i want to re-execute this function
        this.isListening = false;

        //HTTP Server
        try {
            const listenErrorHandler = (error: any) => {
                if (error.code !== 'EADDRINUSE') return;
                fatalError.WebServer(0, [
                    `Failed to start HTTP server, port ${error.port} is already in use.`,
                    'Maybe you already have another txAdmin running in this port.',
                    'If you want to run multiple txAdmin instances, check the documentation for the port convar.',
                    'You can also try restarting the host machine.',
                ]);
            };
            //@ts-ignore
            this.httpServer = HttpClass.createServer(this.httpCallbackHandler.bind(this));
            // this.httpServer = HttpClass.createServer((req, res) => {
            //     // const reqSize = parseInt(req.headers['content-length'] || '0');
            //     // if (req.method === 'POST' && reqSize > 0) {
            //     //     console.debug(chalk.yellow(bytes(reqSize)), `HTTP ${req.method} ${req.url}`);
            //     // }

            //     this.httpCallbackHandler(req, res);
            //     // if(checkRateLimit(req?.socket?.remoteAddress)){
            //     //     this.httpCallbackHandler(req, res);
            //     // }else {
            //     //     req.destroy();
            //     // }
            // });
            this.httpServer.on('error', listenErrorHandler);

            const netInterface = txHostConfig.netInterface ?? '0.0.0.0';
            if (txHostConfig.netInterface) {
                console.warn(`Starting with interface ${txHostConfig.netInterface}.`);
                console.warn('If the HTTP server doesn\'t start, this is probably the reason.');
            }

            this.httpServer.listen(txHostConfig.txaPort, netInterface, async () => {
                //Sanity check on globals, to _guarantee_ all routes will have access to them
                if (!txCore || isProxy(txCore) || !txConfig || !txManager) {
                    console.dir({
                        txCore: Boolean(txCore),
                        txCoreType: isProxy(txCore) ? 'proxy' : 'not proxy',
                        txConfig: Boolean(txConfig),
                        txManager: Boolean(txManager),
                    });
                    fatalError.WebServer(2, [
                        'The HTTP server started before the globals were ready.',
                        'This error should NEVER happen.',
                        'Please report it to the developers.',
                    ]);
                }
                if (txHostConfig.netInterface) {
                    console.ok(`Listening on ${netInterface}.`);
                }
                this.isListening = true;
            });
        } catch (error) {
            fatalError.WebServer(1, 'Failed to start HTTP server.', error);
        }
    }


    /**
     * handler for the shutdown event
     */
    public handleShutdown() {
        return this.webSocket.handleShutdown();
    }


    /**
     * Resetting lua comms token - called by fxRunner on spawnServer()
     */
    resetToken() {
        this.luaComToken = nanoid();
        console.verbose.debug('Resetting luaComToken.');
    }
};
