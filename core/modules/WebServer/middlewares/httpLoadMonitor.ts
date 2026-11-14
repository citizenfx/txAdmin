const modulename = 'WebServer:PacketDropper';
import v8 from 'node:v8';
import bytes from 'bytes';
import consoleFactory from '@lib/console';
const console = consoleFactory(modulename);

//Config
const RPM_CHECK_INTERVAL = 800; //multiples of 100 only
const HIGH_LOAD_RPM = 15_000;
const HEAP_USED_LIMIT = 0.9;
const REQ_BLOCKER_DURATION = 60; //seconds

//Vars
let reqCounter = 0;
let lastCheckTime = Date.now();
let isUnderHighLoad = false;
let acceptRequests = true;

//Helpers
const getHeapUsage = () => {
    const heapStats = v8.getHeapStatistics();
    return {
        heapSize: bytes(heapStats.used_heap_size),
        heapLimit: bytes(heapStats.heap_size_limit),
        heapUsed: (heapStats.used_heap_size / heapStats.heap_size_limit),
    };
}

/**
 * Protects txAdmin against a massive HTTP load, no matter the source of the requests.
 * It will print warnings if the server is under high load and block requests if heap is almost full.
 */
const checkHttpLoad = () => {
    if (!acceptRequests) return false;

    //Check RPM
    reqCounter++;
    if (reqCounter >= RPM_CHECK_INTERVAL) {
        reqCounter = 0;
        const now = Date.now();
        const elapsedMs = now - lastCheckTime;
        lastCheckTime = now;
        const requestsPerMinute = Math.ceil((RPM_CHECK_INTERVAL / elapsedMs) * 60_000);

        if (requestsPerMinute > HIGH_LOAD_RPM) {
            isUnderHighLoad = true;
            console.warn(`txAdmin is under high HTTP load: ~${Math.round(requestsPerMinute / 1000)}k reqs/min.`);
        } else {
            isUnderHighLoad = false;
            // console.debug(`${requestsPerMinute.toLocaleString()} rpm`);
        }
    }

    //Every 100 requests if under high load
    if (isUnderHighLoad && reqCounter % 100 === 0) {
        const { heapSize, heapLimit, heapUsed } = getHeapUsage();
        // console.debug((heapUsed * 100).toFixed(2) + '% heap');
        if (heapUsed > HEAP_USED_LIMIT) {
            console.majorMultilineError([
                `Node.js's V8 engine heap is almost full: ${(heapUsed * 100).toFixed(2)}% (${heapSize}/${heapLimit})`,
                `All HTTP requests will be blocked for the next ${REQ_BLOCKER_DURATION} seconds to prevent a crash.`,
                'Make sure you have a proper firewall setup and/or a reverse proxy with rate limiting.',
                'You can join https://txadmin.gg/discord for support.'
            ]);
            //Resetting counter
            reqCounter = 0;

            //Blocking requests + setting a timeout to unblock
            acceptRequests = false;
            setTimeout(() => {
                acceptRequests = true;
                console.warn('HTTP requests are now allowed again.');
            }, REQ_BLOCKER_DURATION * 1000);
        }
    }

    return acceptRequests;
};

export default checkHttpLoad;
