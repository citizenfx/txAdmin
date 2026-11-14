const modulename = 'WebSocket';
import { Server as SocketIO, Socket, RemoteSocket } from 'socket.io';
import consoleFactory from '@lib/console';
import statusRoom from './wsRooms/status';
import dashboardRoom from './wsRooms/dashboard';
import playerlistRoom from './wsRooms/playerlist';
import liveconsoleRoom from './wsRooms/liveconsole';
import serverlogRoom from './wsRooms/serverlog';
import { AuthedAdminType, checkRequestAuth } from './authLogic';
import { SocketWithSession } from './ctxTypes';
import { isIpAddressLocal } from '@lib/host/isIpAddressLocal';
import { txEnv } from '@core/globalData';
const console = consoleFactory(modulename);

//Types
export type RoomCommandHandlerType = {
    permission: string | true;
    handler: (admin: AuthedAdminType, ...args: any) => any
}

export type RoomType = {
    permission: string | true;
    eventName: string;
    cumulativeBuffer: boolean;
    outBuffer: any;
    commands?: Record<string, RoomCommandHandlerType>;
    initialData: () => any;
}

//NOTE: quen adding multiserver, create dynamic rooms like playerlist#<svname>
const VALID_ROOMS = ['status', 'dashboard', 'liveconsole', 'serverlog', 'playerlist'] as const;
type RoomNames = typeof VALID_ROOMS[number];


//Helpers
const getIP = (socket: SocketWithSession) => {
    return socket?.request?.socket?.remoteAddress ?? 'unknown';
};
const terminateSession = (socket: SocketWithSession, reason: string, shouldLog = true) => {
    try {
        socket.emit('logout', reason);
        socket.disconnect();
        if (shouldLog) {
            console.verbose.warn('SocketIO', 'dropping new connection:', reason);
        }
    } catch (error) { }
};
const forceUiReload = (socket: SocketWithSession) => {
    try {
        socket.emit('refreshToUpdate');
        socket.disconnect();
    } catch (error) { }
};
const sendShutdown = (socket: SocketWithSession) => {
    try {
        socket.emit('txAdminShuttingDown');
        socket.disconnect();
    } catch (error) { }
};

export default class WebSocket {
    readonly #io: SocketIO;
    readonly #rooms: Record<RoomNames, RoomType>;
    #eventBuffer: { name: string, data: any }[] = [];

    constructor(io: SocketIO) {
        this.#io = io;
        this.#rooms = {
            status: statusRoom,
            dashboard: dashboardRoom,
            playerlist: playerlistRoom,
            liveconsole: liveconsoleRoom,
            serverlog: serverlogRoom,
        };

        setInterval(this.flushBuffers.bind(this), 250);
    }


    /**
     * Sends a shutdown signal to all connected clients
     */
    public async handleShutdown() {
        const sockets = await this.#io.fetchSockets();
        for (const socket of sockets) {
            //@ts-ignore
            sendShutdown(socket);
        }
    }


    /**
     * Refreshes the auth data for all connected admins
     * If an admin is not authed anymore, they will be disconnected
     * If an admin lost permission to a room, they will be kicked out of it
     * This is called from AdminStore.refreshOnlineAdmins()
     */
    async reCheckAdminAuths() {
        const sockets = await this.#io.fetchSockets();
        console.verbose.warn(`SocketIO`, `AdminStore changed, refreshing auth for ${sockets.length} sockets.`);
        for (const socket of sockets) {
            //@ts-ignore
            const reqIp = getIP(socket);
            const authResult = checkRequestAuth(
                socket.handshake.headers,
                reqIp,
                isIpAddressLocal(reqIp),
                //@ts-ignore
                socket.sessTools
            );
            if (!authResult.success) {
                //@ts-ignore
                terminateSession(socket, 'session invalidated by websocket.reCheckAdminAuths()', true);
                continue;
            }

            //Sending auth data update - even if nothing changed
            const { admin: authedAdmin } = authResult;
            socket.emit('updateAuthData', authedAdmin.getAuthData());

            //Checking permission of all joined rooms
            for (const roomName of socket.rooms) {
                if (roomName === socket.id) continue;
                const roomData = this.#rooms[roomName as RoomNames];
                if (!roomData) continue;
                if (roomData.permission !== true && !authedAdmin.hasPermission(roomData.permission)) {
                    socket.leave(roomName);
                }
            }
        }
    }


    /**
     * Handles incoming connection requests,
     */
    handleConnection(socket: SocketWithSession) {
        //Check the UI version
        if (socket.handshake.query.uiVersion && socket.handshake.query.uiVersion !== txEnv.txaVersion) {
            return forceUiReload(socket);
        }

        try {
            //Checking for session auth
            const reqIp = getIP(socket);
            const authResult = checkRequestAuth(
                socket.handshake.headers,
                reqIp,
                isIpAddressLocal(reqIp),
                socket.sessTools
            );
            if (!authResult.success) {
                return terminateSession(socket, 'invalid session', false);
            }
            const { admin: authedAdmin } = authResult;


            //Check if joining any room
            if (typeof socket.handshake.query.rooms !== 'string') {
                return terminateSession(socket, 'no query.rooms');
            }

            //Validating requested rooms
            const requestedRooms = socket.handshake.query.rooms
                .split(',')
                .filter((v, i, arr) => arr.indexOf(v) === i)
                .filter(r => VALID_ROOMS.includes(r as any));
            if (!requestedRooms.length) {
                return terminateSession(socket, 'no valid room requested');
            }

            //To prevent user from receiving data duplicated in initial data and buffer data
            //we need to flush the buffers first. This is a bit hacky, but performance shouldn't
            //really be an issue since we are first validating the user auth.
            this.flushBuffers();

            //For each valid requested room
            for (const requestedRoomName of requestedRooms) {
                const room = this.#rooms[requestedRoomName as RoomNames];

                //Checking Perms
                if (room.permission !== true && !authedAdmin.hasPermission(room.permission)) {
                    continue;
                }

                //Setting up event handlers
                for (const [commandName, commandData] of Object.entries(room.commands ?? [])) {
                    if (commandData.permission === true || authedAdmin.hasPermission(commandData.permission)) {
                        socket.on(commandName, (...args) => {
                            //Checking if admin is still in the room - perms change can make them be kicked out of room
                            if (socket.rooms.has(requestedRoomName)) {
                                commandData.handler(authedAdmin, ...args);
                            } else {
                                console.verbose.debug('SocketIO', `Command '${requestedRoomName}#${commandName}' was ignored due to admin not being in the room.`);
                            }
                        });
                    }
                }

                //Sending initial data
                socket.join(requestedRoomName);
                socket.emit(room.eventName, room.initialData());
            }

            //General events
            socket.on('disconnect', (reason) => {
                // console.verbose.debug('SocketIO', `Client disconnected with reason: ${reason}`);
            });
            socket.on('error', (error) => {
                console.verbose.debug('SocketIO', `Socket error with message: ${error.message}`);
            });

            // console.verbose.log('SocketIO', `Connected: ${authedAdmin.name} from ${getIP(socket)}`);
        } catch (error) {
            console.error('SocketIO', `Error handling new connection: ${(error as Error).message}`);
            socket.disconnect();
        }
    }


    /**
     * Adds data to the a room buffer
     */
    buffer<T>(roomName: RoomNames, data: T) {
        const room = this.#rooms[roomName];
        if (!room) throw new Error('Room not found');

        if (room.cumulativeBuffer) {
            if (Array.isArray(room.outBuffer)) {
                room.outBuffer.push(data);
            } else if (typeof room.outBuffer === 'string') {
                room.outBuffer += data;
            } else {
                throw new Error(`cumulative buffers can only be arrays or strings`);
            }
        } else {
            room.outBuffer = data;
        }
    }


    /**
     * Flushes the data buffers
     * NOTE: this will also send data to users that no longer have permissions
     */
    flushBuffers() {
        //Sending room data
        for (const [roomName, room] of Object.entries(this.#rooms)) {
            if (room.cumulativeBuffer && room.outBuffer.length) {
                this.#io.to(roomName).emit(room.eventName, room.outBuffer);
                if (Array.isArray(room.outBuffer)) {
                    room.outBuffer = [];
                } else if (typeof room.outBuffer === 'string') {
                    room.outBuffer = '';
                } else {
                    throw new Error(`cumulative buffers can only be arrays or strings`);
                }
            } else if (!room.cumulativeBuffer && room.outBuffer !== null) {
                this.#io.to(roomName).emit(room.eventName, room.outBuffer);
                room.outBuffer = null;
            }
        }

        //Sending events
        for (const event of this.#eventBuffer) {
            this.#io.emit(event.name, event.data);
        }
        this.#eventBuffer = [];
    }


    /**
     * Pushes the initial data again for everyone in a room
     * NOTE: we probably don't need to wait one tick, but since we are working with 
     * event handling, things might take a tick to update their status (maybe discord bot?)
     */
    pushRefresh(roomName: RoomNames) {
        if (!VALID_ROOMS.includes(roomName)) throw new Error(`Invalid room '${roomName}'.`);
        const room = this.#rooms[roomName];
        if (room.cumulativeBuffer) throw new Error(`The room '${roomName}' has a cumulative buffer.`);
        setImmediate(() => {
            room.outBuffer = room.initialData();
        });
    }


    /**
     * Broadcasts an event to all connected clients
     * This is used for data syncs that are not related to a specific room
     * eg: update available
     */
    pushEvent<T>(name: string, data: T) {
        this.#eventBuffer.push({ name, data });
    }
};
