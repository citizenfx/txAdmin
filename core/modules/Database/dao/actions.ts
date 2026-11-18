import { cloneDeep } from 'lodash-es';
import { DbInstance, SavePriority } from "../instance";
import { DatabaseActionBanType, DatabaseActionType, DatabaseActionWarnType } from "../databaseTypes";
import { genActionID } from "../dbUtils";
import { now } from '@lib/misc';
import consoleFactory from '@lib/console';
const console = consoleFactory('DatabaseDao');


/**
 * Data access object for the database "actions" collection.
 */
export default class ActionsDao {
    constructor(private readonly db: DbInstance) { }

    private get dbo() {
        if (!this.db.obj || !this.db.isReady) throw new Error(`database not ready yet`);
        return this.db.obj;
    }

    private get chain() {
        if (!this.db.obj || !this.db.isReady) throw new Error(`database not ready yet`);
        return this.db.obj.chain;
    }


    /**
     * Searches for an action in the database by the id, returns action or null if not found
     */
    findOne(actionId: string): DatabaseActionType | null {
        if (typeof actionId !== 'string' || !actionId.length) throw new Error('Invalid actionId.');

        //Performing search
        const a = this.chain.get('actions')
            .find({ id: actionId })
            .cloneDeep()
            .value();
        return (typeof a === 'undefined') ? null : a;
    }


    /**
     * Searches for any registered action in the database by a list of identifiers and optional filters
     * Usage example: findMany(['license:xxx'], undefined, {type: 'ban', revocation.timestamp: null})
     */
    findMany<T extends DatabaseActionType>(
        idsArray: string[],
        hwidsArray?: string[],
        customFilter: ((action: DatabaseActionType) => action is T) | object = {}
    ): T[] {
        if (!Array.isArray(idsArray)) throw new Error('idsArray should be an array');
        if (hwidsArray && !Array.isArray(hwidsArray)) throw new Error('hwidsArray should be an array or undefined');
        const idsFilter = (action: DatabaseActionType) => idsArray.some((fi) => action.ids.includes(fi))
        const hwidsFilter = (action: DatabaseActionType) => {
            if ('hwids' in action && action.hwids) {
                const count = hwidsArray!.filter((fi) => action.hwids?.includes(fi)).length;
                return count >= txConfig.banlist.requiredHwidMatches;
            } else {
                return false;
            }
        }

        try {
            //small optimization
            const idsMatchFilter = hwidsArray && hwidsArray.length && txConfig.banlist.requiredHwidMatches
                ? (a: DatabaseActionType) => idsFilter(a) || hwidsFilter(a)
                : (a: DatabaseActionType) => idsFilter(a)

            return this.chain.get('actions')
                .filter(customFilter as (a: DatabaseActionType) => a is T)
                .filter(idsMatchFilter)
                .cloneDeep()
                .value()
                .sort((a, b) => a.timestamp - b.timestamp); //FIXME: shouldn't be needed, remove after the autosort migration
        } catch (error) {
            const msg = `Failed to search for a registered action database with error: ${(error as Error).message}`;
            console.verbose.error(msg);
            throw new Error(msg);
        }
    }


    /**
     * Registers a ban action and returns its id
     */
    registerBan(
        ids: string[],
        author: string,
        reason: string,
        expiration: number | false,
        playerName: string | false = false,
        hwids?: string[], //only used for bans
    ): string {
        //Sanity check
        if (!Array.isArray(ids) || !ids.length) throw new Error('Invalid ids array.');
        if (typeof author !== 'string' || !author.length) throw new Error('Invalid author.');
        if (typeof reason !== 'string' || !reason.length) throw new Error('Invalid reason.');
        if (expiration !== false && (typeof expiration !== 'number')) throw new Error('Invalid expiration.');
        if (playerName !== false && (typeof playerName !== 'string' || !playerName.length)) throw new Error('Invalid playerName.');
        if (hwids && !Array.isArray(hwids)) throw new Error('Invalid hwids array.');

        //Saves it to the database
        const timestamp = now();
        try {
            const actionID = genActionID(this.dbo, 'ban');
            const toDB: DatabaseActionBanType = {
                id: actionID,
                type: 'ban',
                ids,
                hwids,
                playerName,
                reason,
                author,
                timestamp,
                expiration,
                revocation: {
                    timestamp: null,
                    author: null,
                },
            };
            this.chain.get('actions')
                .push(toDB)
                .value();
            this.db.writeFlag(SavePriority.HIGH);
            return actionID;
        } catch (error) {
            let msg = `Failed to register ban to database with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }


    /**
     * Registers a warn action and returns its id
     */
    registerWarn(
        ids: string[],
        author: string,
        reason: string,
        playerName: string | false = false,
    ): string {
        //Sanity check
        if (!Array.isArray(ids) || !ids.length) throw new Error('Invalid ids array.');
        if (typeof author !== 'string' || !author.length) throw new Error('Invalid author.');
        if (typeof reason !== 'string' || !reason.length) throw new Error('Invalid reason.');
        if (playerName !== false && (typeof playerName !== 'string' || !playerName.length)) throw new Error('Invalid playerName.');

        //Saves it to the database
        const timestamp = now();
        try {
            const actionID = genActionID(this.dbo, 'warn');
            const toDB: DatabaseActionWarnType = {
                id: actionID,
                type: 'warn',
                ids,
                playerName,
                reason,
                author,
                timestamp,
                expiration: false,
                acked: false,
                revocation: {
                    timestamp: null,
                    author: null,
                },
            };
            this.chain.get('actions')
                .push(toDB)
                .value();
            this.db.writeFlag(SavePriority.HIGH);
            return actionID;
        } catch (error) {
            let msg = `Failed to register warn to database with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }

    /**
     * Marks a warning as acknowledged
     */
    ackWarn(actionId: string) {
        if (typeof actionId !== 'string' || !actionId.length) throw new Error('Invalid actionId.');

        try {
            const action = this.chain.get('actions')
                .find({ id: actionId })
                .value();
            if (!action) throw new Error(`action not found`);
            if (action.type !== 'warn') throw new Error(`action is not a warn`);
            action.acked = true;
            this.db.writeFlag(SavePriority.MEDIUM);
        } catch (error) {
            const msg = `Failed to ack warn with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }


    /**
     * Revoke an action (ban, warn)
     */
    revoke(
        actionId: string,
        author: string,
        allowedTypes: string[] | true = true
    ): DatabaseActionType {
        if (typeof actionId !== 'string' || !actionId.length) throw new Error('Invalid actionId.');
        if (typeof author !== 'string' || !author.length) throw new Error('Invalid author.');
        if (allowedTypes !== true && !Array.isArray(allowedTypes)) throw new Error('Invalid allowedTypes.');

        try {
            const action = this.chain.get('actions')
                .find({ id: actionId })
                .value();

            if (!action) throw new Error(`action not found`);
            if (allowedTypes !== true && !allowedTypes.includes(action.type)) {
                throw new Error(`you do not have permission to revoke this action`);
            }

            action.revocation = {
                timestamp: now(),
                author,
            };
            this.db.writeFlag(SavePriority.HIGH);
            return cloneDeep(action);

        } catch (error) {
            const msg = `Failed to revoke action with message: ${(error as Error).message}`;
            console.error(msg);
            console.verbose.dir(error);
            throw error;
        }
    }
}
