import { Action } from ".";
import { Identify } from "../../payloads";
import ServiceSocket from "../ServiceSocket";
import log from "../../log";
import { USE_PSK, PSK } from "../..";
import { tokenExists, generateToken, checkToken } from "../../tokens";

export const IdentifyAction: Action = {
    intent: "connection/identify",
    handler: async (socket, {name, baseMetrics, psk, token}: Identify) => {
        // sockets cant re-identify. they must make a new session.
        if (socket.identified) {
            await socket.sendError({
                alreadyIdentified: true,
                message: "Socket is already identified. Establish a new connection for a new identity."
            }, true);
            return;
        }

        if (await ServiceSocket.isNameInUse(name)) {
            log.warn(`socket failed identification beacuse it attempted to use a name in-use "${name}"`);
            await socket.sendError({
                nameInUse: true,
                message: "That name is currently assigned to another socket. Establish a new connection with a new name, or close the existing connection."
            }, true);
            return;
        }

        // check psk
        if (USE_PSK && (PSK !== psk)) {
            log.info(`socket failed psk auth for service "${name}"`);
            await socket.sendError({
                incorrectPSK: true
            }, true);
            return;
        }

        // check or generate token
        let newToken: string;
        if (await tokenExists(name)) {
            if (!(await checkToken(name, token!))) {
                log.info(`socket failed token auth for service "${name}"`)
                await socket.sendError({
                    incorrectToken: true
                }, true);
                return;
            }
        } else {
            newToken = await generateToken(name);
        }

        socket.name = name;
        socket.latestMetrics = baseMetrics;
        socket.identified = true;

        await socket.send({
            i: 'status/connected',
            d: {
                newToken: newToken! || undefined
            }
        });
    }
}