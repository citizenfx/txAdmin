const modulename = 'WebServer:Resources';
import path from 'node:path';
import slash from 'slash';
import slug from 'slug';
import consoleFactory from '@lib/console';
import { SYM_SYSTEM_AUTHOR } from '@lib/symbols';
const console = consoleFactory(modulename);

//Helper functions
const isUndefined = (x) => (x === undefined);
const breakPath = (inPath) => slash(path.normalize(inPath)).split('/').filter(String);
const dynamicSort = (prop) => {
    let sortOrder = 1;
    if (prop[0] === '-') {
        sortOrder = -1;
        prop = prop.substr(1);
    }
    return function (a, b) {
        const result = (a[prop] < b[prop]) ? -1 : (a[prop] > b[prop]) ? 1 : 0;
        return result * sortOrder;
    };
};
const getResourceSubPath = (resPath) => {
    if (resPath.indexOf('system_resources') >= 0) return 'system_resources';
    if (!path.isAbsolute(resPath)) return resPath;

    let serverDataPathArr = breakPath(`${txConfig.server.dataPath}/resources`);
    let resPathArr = breakPath(resPath);
    for (let i = 0; i < serverDataPathArr.length; i++) {
        if (isUndefined(resPathArr[i])) break;
        if (serverDataPathArr[i].toLowerCase() == resPathArr[i].toLowerCase()) {
            delete resPathArr[i];
        }
    }
    resPathArr.pop();
    resPathArr = resPathArr.filter(String);

    if (resPathArr.length) {
        return resPathArr.join('/');
    } else {
        return 'root';
    }
};

/**
 * Returns the resources list
 * @param {import('@modules/WebServer/ctxTypes').AuthedCtx} ctx
 */
export default async function Resources(ctx) {
    if (!txCore.fxRunner.child?.isAlive) {
        return ctx.utils.renderMessage(
            'The resources list is only available when the server is running.',
        );
    }

    const timeoutMessage = `<strong>Couldn't load the resources list.</strong> <br>
    - Make sure the server is online (try to join it). <br>
    - Make sure you don't have more than 1000 resources. <br>
    - Make sure you are not running the FXServer outside of txAdmin. <br>
    - Check the <strong>Live Console</strong> for any errors which may indicate that some resource has a malformed <code>fxmanifest.lua</code> file.`;

    //Send command request
    const cmdSuccess = txCore.fxRunner.sendCommand('txaReportResources', [], SYM_SYSTEM_AUTHOR);
    if (!cmdSuccess) {
        return ctx.utils.renderMessage(timeoutMessage);
    }

    //Timer fot list delivery
    let tListTimer;
    let tErrorTimer;
    const tList = new Promise((resolve, reject) => {
        tListTimer = setInterval(() => {
            if (
                txCore.fxResources.resourceReport
                && (new Date() - txCore.fxResources.resourceReport.ts) <= 1000
                && Array.isArray(txCore.fxResources.resourceReport.resources)
            ) {
                clearTimeout(tListTimer);
                clearTimeout(tErrorTimer);
                const resGroups = processResources(txCore.fxResources.resourceReport.resources);
                const renderData = {
                    headerTitle: 'Resources',
                    resGroupsJS: JSON.stringify(resGroups),
                    resGroups,
                    disableActions: (ctx.admin.hasPermission('commands.resources')) ? '' : 'disabled',
                };
                resolve({ renderData });
            }
        }, 100);
    });

    //Timer for timing out
    const tError = new Promise((resolve, reject) => {
        tErrorTimer = setTimeout(() => {
            clearTimeout(tListTimer);
            resolve({ renderMessage: timeoutMessage });
        }, 1000);
    });

    //Start race and give output
    const { renderMessage, renderData } = await Promise.race([tList, tError]);
    if (renderMessage) {
        return ctx.utils.renderMessage(renderMessage);
    } else if (renderData) {
        return ctx.utils.render('main/resources', renderData);
    } else {
        return ctx.utils.error(500, 'Invalid response from Promise.race');
    }
};


//================================================================
/**
 * Returns the Processed Resource list.
 * @param {array} resList
 */
function processResources(resList) {
    //Clean resource data and add it so an object separated by subpaths
    const resGroupList = {};
    resList.forEach((resource) => {
        if (isUndefined(resource.name) || isUndefined(resource.status) || isUndefined(resource.path) || resource.path === '') {
            return;
        }
        const subPath = getResourceSubPath(resource.path);
        const resData = {
            name: resource.name,
            divName: slug(resource.name),
            status: resource.status,
            statusClass: (resource.status === 'started') ? 'success' : 'danger',
            // path: slash(path.normalize(resource.path)),
            version: (resource.version) ? `(${resource.version.trim()})` : '',
            author: (resource.author) ? `${resource.author.trim()}` : '',
            description: (resource.description) ? resource.description.trim() : '',
        };

        if (resGroupList.hasOwnProperty(subPath)) {
            resGroupList[subPath].push(resData);
        } else {
            resGroupList[subPath] = [resData];
        }
    });

    //Generate final array with subpaths and div ids
    const finalList = [];
    Object.keys(resGroupList).forEach((subPath) => {
        const subPathData = {
            subPath: subPath,
            divName: slug(subPath),
            resources: resGroupList[subPath].sort(dynamicSort('name')),
        };
        finalList.push(subPathData);
    });

    // finalList = JSON.stringify(finalList, null, 2)
    // console.log(finalList)
    // return []
    return finalList;
}
