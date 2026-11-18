//NOTE: must be imported first to setup the environment
import { txEnv, txHostConfig } from './globalData';
import consoleFactory from '@lib/console';

//Can be imported after
import fs from 'node:fs';
import checkPreRelease from './boot/checkPreRelease';
import fatalError from '@lib/fatalError';
import { ensureProfileStructure, setupProfile } from './boot/setup';
import setupProcessHandlers from './boot/setupProcessHandlers';
import bootTxAdmin from './txAdmin';
const console = consoleFactory();


//Early process stuff
try {
    process.title = 'txAdmin'; //doesn't work for now
    setupProcessHandlers();
    checkPreRelease();
} catch (error) {
    fatalError.Boot(0, 'Failed early process setup.', error);
}
console.log(`Starting txAdmin v${txEnv.txaVersion}/b${txEnv.fxsVersionTag}...`);


//Setting up txData & Profile
try {
    if (!fs.existsSync(txHostConfig.dataPath)) {
        fs.mkdirSync(txHostConfig.dataPath);
    }
} catch (error) {
    fatalError.Boot(1, [
        `Failed to check or create the data folder.`,
        ['Path', txHostConfig.dataPath],
    ], error);
}
let isNewProfile = false;
try {
    if (fs.existsSync(txEnv.profilePath)) {
        ensureProfileStructure();
    } else {
        setupProfile();
        isNewProfile = true;
    }
} catch (error) {
    fatalError.Boot(2, [
        `Failed to check or create the txAdmin profile folder.`,
        ['Data Path', txHostConfig.dataPath],
        ['Profile Name', txEnv.profileName],
        ['Profile Path', txEnv.profilePath],
    ], error);
}
if (isNewProfile && txEnv.profileName !== 'default') {
    console.log(`Profile path: ${txEnv.profilePath}`);
}


//Start txAdmin (have fun 😀)
try {
    bootTxAdmin();
} catch (error) {
    fatalError.Boot(3, 'Failed to start txAdmin.', error);
}


//Freeze detector - starts after 10 seconds due to the initial bootup lag
const bootGracePeriod = 15_000;
const loopInterval = 500;
const loopElapsedLimit = 2_000;
setTimeout(() => {
    let hdTimer = Date.now();
    setInterval(() => {
        const now = Date.now();
        if (now - hdTimer > loopElapsedLimit) {
            console.majorMultilineError([
                'Major VPS freeze/lag detected!',
                'THIS IS NOT AN ERROR CAUSED BY TXADMIN!',
            ]);
        }
        hdTimer = now;
    }, loopInterval);
}, bootGracePeriod);
