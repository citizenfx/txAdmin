import boxen, { type Options as BoxenOptions } from 'boxen';
import chalk from 'chalk';
import open from 'open';
import { shuffle } from 'd3-array';
import { z } from 'zod';

import got from '@lib/got';
import getOsDistro from '@lib/host/getOsDistro.js';
import { txDevEnv, txEnv, txHostConfig } from '@core/globalData';
import consoleFactory from '@lib/console';
import { addLocalIpAddress, formatHostPort } from '@lib/host/isIpAddressLocal';
import { chalkInversePad } from '@lib/misc';
const console = consoleFactory();


export const getPublicIp = async () => {
    const zIpValidator = z.string().ip();
    const reqOptions = {
        timeout: { request: 2000 },
    };
    const httpGetter = async (url: string, jsonPath: string) => {
        const res = await got(url, reqOptions).json();
        return zIpValidator.parse((res as any)[jsonPath]);
    };

    const allApis = shuffle([
        ['https://api.ipify.org?format=json', 'ip'],
        ['https://api.myip.com', 'ip'],
        ['https://ipv4.jsonip.com/', 'ip'],
        ['https://api.my-ip.io/v2/ip.json', 'ip'],
        ['https://www.l2.io/ip.json', 'ip'],
    ]);
    for await (const [url, jsonPath] of allApis) {
        try {
            return await httpGetter(url, jsonPath);
        } catch (error) { }
    }
    return false;
};

const getOSMessage = async () => {
    const serverMessage = [
        `To be able to access txAdmin from the internet open port ${txHostConfig.txaPort}`,
        'on your OS Firewall as well as in the hosting provider.',
    ];
    const winWorkstationMessage = [
        '[!] Home-hosting fxserver is not recommended [!]',
        'You need to open the fxserver port (usually 30120) on Windows Firewall',
        'and set up port forwarding on your router so other players can access it.',
    ];

    //FIXME: use si.osInfo() instead
    const distro = await getOsDistro();
    return (distro && distro.includes('Linux') || distro.includes('Server'))
        ? serverMessage
        : winWorkstationMessage;
};

const awaitHttp = new Promise((resolve, reject) => {
    const tickLimit = 100; //if over 15 seconds
    let counter = 0;
    let interval: NodeJS.Timeout;
    const check = () => {
        counter++;
        if (txCore.webServer && txCore.webServer.isListening && txCore.webServer.isServing) {
            clearInterval(interval);
            resolve(true);
        } else if (counter == tickLimit) {
            clearInterval(interval);
            interval = setInterval(check, 2500);
        } else if (counter > tickLimit) {
            console.warn('The WebServer is taking too long to start:', {
                module: !!txCore.webServer,
                listening: txCore?.webServer?.isListening,
                serving: txCore?.webServer?.isServing,
            });
        }
    };
    interval = setInterval(check, 150);
});

const awaitMasterPin = new Promise((resolve, reject) => {
    const tickLimit = 100; //if over 15 seconds
    let counter = 0;
    let interval: NodeJS.Timeout;
    const check = () => {
        counter++;
        if (txCore.adminStore && txCore.adminStore.admins !== null) {
            clearInterval(interval);
            const pin = (txCore.adminStore.admins === false) ? txCore.adminStore.addMasterPin : false;
            resolve(pin);
        } else if (counter == tickLimit) {
            clearInterval(interval);
            interval = setInterval(check, 2500);
        } else if (counter > tickLimit) {
            console.warn('The AdminStore is taking too long to start:', {
                module: !!txCore.adminStore,
                admins: txCore?.adminStore?.admins === null ? 'null' : 'not null',
            });
        }
    };
    interval = setInterval(check, 150);
});

const awaitDatabase = new Promise((resolve, reject) => {
    const tickLimit = 100; //if over 15 seconds
    let counter = 0;
    let interval: NodeJS.Timeout;
    const check = () => {
        counter++;
        if (txCore.database && txCore.database.isReady) {
            clearInterval(interval);
            resolve(true);
        } else if (counter == tickLimit) {
            clearInterval(interval);
            interval = setInterval(check, 2500);
        } else if (counter > tickLimit) {
            console.warn('The Database is taking too long to start:', {
                module: !!txCore.database,
                ready: !!txCore?.database?.isReady,
            });
        }
    };
    interval = setInterval(check, 150);
});


export const startReadyWatcher = async (cb: () => void) => {
    const [publicIpResp, msgRes, adminPinRes] = await Promise.allSettled([
        getPublicIp(),
        getOSMessage(),
        awaitMasterPin as Promise<undefined | string | false>,
        awaitHttp,
        awaitDatabase,
    ]);

    //Addresses
    let detectedUrls;
    if (txHostConfig.netInterface && txHostConfig.netInterface !== '0.0.0.0' && txHostConfig.netInterface !== '::') {
        detectedUrls = [txHostConfig.netInterface];
    } else {
        detectedUrls = [
            (txEnv.isWindows) ? 'localhost' : 'your-public-ip',
        ];
        if ('value' in publicIpResp && publicIpResp.value) {
            detectedUrls.push(publicIpResp.value);
            addLocalIpAddress(publicIpResp.value);
        }
    }
    const bannerUrls = txHostConfig.txaUrl
        ? [txHostConfig.txaUrl]
        : detectedUrls.map((addr) => `http://${formatHostPort(addr, txHostConfig.txaPort)}/`);

    //Admin PIN
    const adminMasterPin = 'value' in adminPinRes && adminPinRes.value ? adminPinRes.value : false;
    const adminPinLines = !adminMasterPin ? [] : [
        '',
        'Use the PIN below to register:',
        chalk.inverse(` ${adminMasterPin} `),
    ];

    //Printing stuff
    const boxOptions = {
        padding: 1,
        margin: 1,
        align: 'center',
        borderStyle: 'bold',
        borderColor: 'cyan',
    } satisfies BoxenOptions;
    const boxLines = [
        'All ready! Please access:',
        ...bannerUrls.map(chalkInversePad),
        ...adminPinLines,
    ];
    console.multiline(boxen(boxLines.join('\n'), boxOptions), chalk.bgGreen);
    if (!txDevEnv.ENABLED && !txHostConfig.netInterface && 'value' in msgRes && msgRes.value) {
        console.multiline(msgRes.value, chalk.bgBlue);
    }

    //Opening page
    if (txEnv.isWindows && adminMasterPin && bannerUrls[0]) {
        const linkUrl = new URL(bannerUrls[0]);
        linkUrl.pathname = '/addMaster/pin';
        linkUrl.hash = adminMasterPin;
        open(linkUrl.href);
    }

    //Callback
    cb();
};
