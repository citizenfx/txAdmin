const modulename = 'Logger:Admin';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { getBootDivider } from '../loggerUtils';
import consoleFactory from '@lib/console';
import { LoggerBase } from '../LoggerBase';
import { chalkInversePad, getTimeHms } from '@lib/misc';
const console = consoleFactory(modulename);


export default class AdminLogger extends LoggerBase {
    constructor(basePath, lrProfileConfig) {
        const lrDefaultOptions = {
            path: basePath,
            intervalBoundary: true,
            initialRotation: true,
            history: 'admin.history',
            interval: '7d',

        };
        super(basePath, 'admin', lrDefaultOptions, lrProfileConfig);
        this.lrStream.write(getBootDivider());

        this.writeCounter = 0;
    }

    /**
     * Returns a string with short usage stats
     */
    getUsageStats() {
        return {
            writes: this.writeCounter,
            lrErrors: this.lrErrors,
        };
    }

    /**
     * Returns an string with everything in admin.log (the active log rotate file)
     */
    async getRecentBuffer() {
        try {
            return await fsp.readFile(path.join(this.basePath, 'admin.log'), 'utf8');
        } catch (error) {
            return false;
        }
    }

    /**
     * Handles the input of log data
     *
     * @param {string} author
     * @param {string} message
     */
    writeSystem(author, message) {
        const timestamp = getTimeHms();
        this.lrStream.write(`[${timestamp}][${author}] ${message}\n`);
        this.writeCounter++;
    }


    /**
     * Handles the input of log data
     * TODO: add here discord log forwarding
     *
     * @param {string} author
     * @param {string} action
     * @param {'default'|'command'} type
     */
    write(author, action, type = 'default') {
        let saveMsg;
        const prefix = `[${author}]`;
        if (type === 'command') {
            saveMsg = `executed "${action}"`;
            console.log(prefix, `executed ` + chalkInversePad(action));
        } else {
            saveMsg = action;
            console.log(prefix, saveMsg);
        }
        this.writeSystem(author, saveMsg);
    }
};
