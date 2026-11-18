import { getHostData } from "@lib/diagnostics";
import { isProxy } from "util/types";
import { startReadyWatcher } from "./boot/startReadyWatcher";
import { Deployer } from "./deployer";
import { TxConfigState, type FxMonitorHealth } from "@shared/enums";
import type { GlobalStatusType } from "@shared/socketioTypes";
import quitProcess from "@lib/quitProcess";
import consoleFactory, { processStdioEnsureEol, setTTYTitle } from "@lib/console";
import { isNumber, isString } from "@modules/CacheStore";
import { txEnv } from "./globalData";
const console = consoleFactory('Manager');

//Types
type gameNames = 'fivem' | 'redm';
type HostStatusType = {
    //txAdmin state
    cfgPath: string | null;
    dataPath: string | null;
    isConfigured: boolean;
    playerCount: number;
    status: FxMonitorHealth;

    //Detected at runtime
    cfxId: string | null;
    gameName: gameNames | null;
    joinLink: string | null;
    joinDeepLink: string | null;
    playerSlots: number | null;
    projectName: string | null;
    projectDesc: string | null;
}


/**
 * This class is for "high order" logic and methods that shouldn't live inside any specific component.
 */
export default class TxManager {
    public deployer: Deployer | null = null; //FIXME: implementar o deployer
    private readonly moduleShutdownHandlers: (() => void)[] = [];
    public isShuttingDown = false;

    //TODO: move txRuntime here?!

    constructor() {
        //Listen for shutdown signals
        process.on('SIGHUP', this.gracefulShutdown.bind(this));     //terminal closed
        process.on('SIGINT', this.gracefulShutdown.bind(this));     //ctrl+c (mostly users)
        process.on('SIGTERM', this.gracefulShutdown.bind(this));    //kill (docker, etc)

        //Sync start, boot fxserver when conditions are met
        startReadyWatcher(() => {
            txCore.fxRunner.signalStartReady();
        });

        //FIXME: mover o cron do FxMonitor (getHostStats() + websocket push) para cá
        //FIXME: if ever changing this, need to make sure the other data
        //in the status event will be pushed, since right some of now it
        //relies on this event every 5 seconds
        //NOTE: probably txManager should be the one to decide if stuff like the host
        //stats changed enough to merit a refresh push
        setInterval(async () => {
            txCore.webServer.webSocket.pushRefresh('status');
        }, 5000);

        //Updates the terminal title every 15 seconds
        if(txEnv.setConsoleTitle){
            setInterval(() => {
                setTTYTitle(`(${txCore.fxPlayerlist.onlineCount}) ${txConfig.general.serverName} - txAdmin`);
            }, 15000);
        }

        //Pre-calculate static data
        setTimeout(() => {
            getHostData().catch((e) => { });
        }, 10_000);
    }


    /**
     * Gracefully shuts down the application by running all exit handlers.  
     * If the process takes more than 5 seconds to exit, it will force exit.
     */
    public async gracefulShutdown(signal: NodeJS.Signals) {
        //Prevent race conditions
        if (this.isShuttingDown) {
            processStdioEnsureEol();
            console.warn(`Got ${signal} while already shutting down.`);
            return;
        }
        console.warn(`Got ${signal}, shutting down...`);
        this.isShuttingDown = true;

        //Stop all module timers
        for (const moduleName of Object.keys(txCore)) {
            const module = txCore[moduleName as keyof typeof txCore] as GenericTxModuleInstance;
            if (Array.isArray(module.timers)) {
                for (const interval of module.timers) {
                    clearInterval(interval);
                }
            }
        }

        //Sets a hard limit to the shutdown process
        setTimeout(() => {
            console.error(`Graceful shutdown timed out after 5s, forcing exit...`);
            quitProcess(1);
        }, 5000);

        //Run all exit handlers
        await Promise.allSettled(this.moduleShutdownHandlers.map((handler) => handler()));
        console.verbose.debug(`All exit handlers finished, shutting down...`);
        quitProcess(0);
    }


    /**
     * Adds a handler to be run when txAdmin gets a SIG* event
     */
    public addShutdownHandler(handler: () => void) {
        this.moduleShutdownHandlers.push(handler);
    }


    /**
     * Starts the deployer (TODO: rewrite deployer)
     */
    startDeployer(
        recipeText: string | false,
        deploymentID: string,
        targetPath: string,
        isTrustedSource: boolean,
        customMetaData: Record<string, string> = {},
    ) {
        if (this.deployer) {
            throw new Error('Deployer is already running');
        }
        this.deployer = new Deployer(recipeText, deploymentID, targetPath, isTrustedSource, customMetaData);
    }


    // isDeployerRunning(): this is { deployer: Deployer } {
    //     return this.deployer !== null;
    // }


    /**
     * Unknown, Deployer, Setup, Ready
     */
    get configState() {
        if (isProxy(txCore)) {
            return TxConfigState.Unkown;
        } else if (this.deployer) {
            return TxConfigState.Deployer;
        } else if (!txCore.fxRunner.isConfigured) {
            return TxConfigState.Setup;
        } else {
            return TxConfigState.Ready;
        }
    }


    /**
     * Returns the status object that is sent to the host status endpoint
     */
    get hostStatus(): HostStatusType {
        const serverPaths = txCore.fxRunner.serverPaths;
        const cfxId = txCore.cacheStore.getTyped('fxsRuntime:cfxId', isString) ?? null;
        const isGameName = (val: any): val is gameNames => val === 'fivem' || val === 'redm';
        return {
            //txAdmin state
            isConfigured: this.configState === TxConfigState.Ready,
            dataPath: serverPaths?.dataPath ?? null,
            cfgPath: serverPaths?.cfgPath ?? null,
            playerCount: txCore.fxPlayerlist.onlineCount,
            status: txCore.fxMonitor.status.health,

            //Detected at runtime
            cfxId,
            gameName: txCore.cacheStore.getTyped('fxsRuntime:gameName', isGameName) ?? null,
            joinDeepLink: cfxId ? `fivem://connect/cfx.re/join/${cfxId}` : null,
            joinLink: cfxId ? `https://cfx.re/join/${cfxId}` : null,
            playerSlots: txCore.cacheStore.getTyped('fxsRuntime:maxClients', isNumber) ?? null,
            projectName: txCore.cacheStore.getTyped('fxsRuntime:projectName', isString) ?? null,
            projectDesc: txCore.cacheStore.getTyped('fxsRuntime:projectDesc', isString) ?? null,
        }
    }


    /**
     * Returns the global status object that is sent to the clients
     */
    get globalStatus(): GlobalStatusType {
        const fxMonitorStatus = txCore.fxMonitor.status;
        return {
            configState: txManager.configState,
            discord: txCore.discordBot.status,
            runner: {
                isIdle: txCore.fxRunner.isIdle,
                isChildAlive: txCore.fxRunner.child?.isAlive ?? false,
            },
            server: {
                name: txConfig.general.serverName,
                uptime: fxMonitorStatus.uptime,
                health: fxMonitorStatus.health,
                healthReason: fxMonitorStatus.healthReason,
                whitelist: txConfig.whitelist.mode,
            },
            scheduler: txCore.fxScheduler.getStatus(), //no push events, updated every Scheduler.checkSchedule()
        }
    }
}

export type TxManagerType = InstanceType<typeof TxManager>;
