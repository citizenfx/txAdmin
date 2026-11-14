import fs from 'node:fs';
import path from 'node:path/posix';
import { SemVer } from 'semver';
import config from './config';


/**
 * txAdmin in ASCII
 */
export const txAdminASCII = () => {
    //NOTE: precalculating the ascii art for efficiency
    // const figlet = require('figlet');
    // let ascii = figlet.textSync('txAdmin');
    // let b64 = Buffer.from(ascii).toString('base64');
    // console.log(b64);
    const preCalculated = `ICBfICAgICAgICAgICAgXyAgICAgICBfICAgICAgICAgICBfICAgICAgIAogfCB8X19fICBfX
 yAgIC8gXCAgIF9ffCB8XyBfXyBfX18gKF8pXyBfXyAgCiB8IF9fXCBcLyAvICAvIF8gXCAvIF9gIHwgJ18gYCBfIFx8IHwg
 J18gXCAKIHwgfF8gPiAgPCAgLyBfX18gXCAoX3wgfCB8IHwgfCB8IHwgfCB8IHwgfAogIFxfXy9fL1xfXC9fLyAgIFxfXF9
 fLF98X3wgfF98IHxffF98X3wgfF98CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA=`;
    return Buffer.from(preCalculated, 'base64').toString('ascii');
};


/**
 * txAdmin + license banner for bundled files
 */
export const licenseBanner = (baseDir = '.', isBundledFile = false) => {
    const licensePath = path.join(baseDir, 'LICENSE');
    const rootPrefix = isBundledFile ? '../' : '';
    const lineSep = '%'.repeat(80);
    const logoPad = ' '.repeat(18);
    const contentLines = [
        lineSep,
        ...txAdminASCII().split('\n').map((x) => logoPad + x),
        lineSep,
        'Author: André Tabarra (https://github.com/tabarra)',
        'Repository: https://github.com/citizenfx/txAdmin',
        'txAdmin is a free open source software provided under the license below.',
        lineSep,
        ...fs.readFileSync(licensePath, 'utf8').trim().split('\n'),
        lineSep,
        'This distribution also includes third party code under their own licenses, which',
        `can be found in ${rootPrefix}THIRD-PARTY-LICENSES.txt or their respective repositories.`,
        `Attribution for non-code assets can be found at the bottom of ${rootPrefix}README.md or at`,
        'the top of the respective file.',
        lineSep,
    ];
    if (isBundledFile) {
        const flattened = contentLines.join('\n * ');
        return `/*!\n * ${flattened}\n */`;
    } else {
        return contentLines.join('\n');
    }
};


/**
 * Checks if the bin path is valid.
 */
const isBinPathValid = (binPath: string) => {
    const binStat = fs.statSync(binPath, { throwIfNoEntry: false });
    return binStat && binStat.isFile();
};

/**
 * Checks if a directory path is valid.
 */
const isDirPathValid = (dirPath: string) => {
    const dirStat = fs.statSync(dirPath, { throwIfNoEntry: false });
    return dirStat && dirStat.isDirectory();
};


/**
 * Processes a fxserver path to validate it as well as the monitor folder.
 * NOTE: this function is windows only, but could be easily adapted.
 */
export const getFxsPaths = (fxserverPath: string) => {
    const root = path.normalize(fxserverPath);

    //Check if legacy server
    let binName = 'FXServer.exe';
    let bin = path.join(root, 'FXServer.exe');
    let res = path.join(root, 'citizen', 'system_resources', 'monitor');
    if (isBinPathValid(bin) && isDirPathValid(res)) {
        return {root, bin, binName, res};
    }

    //Check if enhanced server
    binName = 'cfx-server.exe';
    bin = path.join(root, 'cfx-server.exe');
    res = path.join(root, 'system_resources', 'txadmin');
    if (isBinPathValid(bin) && isDirPathValid(res)) {
        return {root, bin, binName, res};
    }

    throw new Error(`The path provided does not seem to be a valid FXServer or cfx-server directory.`);
};


/**
 * Extracts the version from the GITHUB_REF env var and detects if pre-release
 * NOTE: to run locally: `GITHUB_REF="refs/tags/v9.9.9" npm run build`
 */
export const getPublishVersion = (isOptional: boolean) => {
    const workflowRef = process.env.GITHUB_REF;
    try {
        if (!workflowRef) {
            if (isOptional) {
                return {
                    txVersion: '9.9.9-dev',
                    isPreRelease: false,
                    preReleaseExpiration: '0',
                };
            } else {
                throw new Error('No --tag found.');
            }
        }
        const refRemoved = workflowRef.replace(/^(refs\/tags\/)?v/, '');
        const parsedVersion = new SemVer(refRemoved);
        const isPreRelease = parsedVersion.prerelease.length > 0;
        const potentialExpiration = new Date().setUTCHours(24 * config.preReleaseExpirationDays, 0, 0, 0);
        console.log(`txAdmin version ${parsedVersion.version}.`);
        return {
            txVersion: parsedVersion.version,
            isPreRelease,
            preReleaseExpiration: isPreRelease ? potentialExpiration.toString() : '0',
        };
    } catch (error) {
        console.error('Version setup failed: ' + (error as Error).message);
        process.exit(1);
    }
};


/**
 * Edits the ./dist/fxmanifest.lua to include the txAdmin version.
 * TODO: set up *_scripts automagically
 */
const setupDistFxmanifest = (targetPath: string, txVersion: string) => {
    // console.log('[BUILDER] Setting up fxmanifest.lua: ' + txVersion);
    const fxManifestPath = path.join(targetPath, 'fxmanifest.lua');
    let fxManifestContent = fs.readFileSync(fxManifestPath, 'utf8');
    fxManifestContent = fxManifestContent.replace(/^version 'REPLACE-VERSION'$/m, `version '${txVersion}'`);
    fs.writeFileSync(fxManifestPath, fxManifestContent);
};


/**
 * Sync the files from local path to target path.
 * This function tried to remove the files before copying new ones,
 * therefore, first make sure the path is correct.
 * NOTE: each change, it resets the entire target path.
 */
export const copyStaticFiles = (targetPath: string, txVersion: string, eventName: string) => {
    console.log(`[COPIER][${eventName}] Syncing ${targetPath}.`);
    for (const srcPath of config.copy) {
        const destPath = path.join(targetPath, srcPath);
        fs.rmSync(destPath, { recursive: true, force: true });
        fs.cpSync(srcPath, destPath, { recursive: true });
    }
    setupDistFxmanifest(targetPath, txVersion);
};
