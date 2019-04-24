import { Action } from ".";
import { Identify } from "../../payloads";
import ServiceSocket from "../ServiceSocket";
import log from "../../log";
import { USE_PSK, PSK } from "../..";
import { tokenExists, generateToken, checkToken } from "../../tokens";

export const IdentifyAction: Action = {
    intent: "identify",
    handler: async (socket, {name, baseMetrics, psk, token}: Identify) => {
        // sockets cant re-identify. they must make a new session.
        if (socket.identified) return;
        if (await ServiceSocket.isNameInUse(name)) {
            socket.socket.close(400, 'name is in use.');
            log.warn(`socket failed identification beacuse it attempted to use a name in-use "${name}"`);
            return;
        }

        if (USE_PSK && (PSK !== psk)) {
            log.info(`socket failed psk auth for service "${name}"`);
            socket.socket.close(401, 'incorrect psk');
            return;
        }

        let newToken: string;
        if (await tokenExists(name)) {
            if (!(await checkToken(name, token!))) {
                log.info(`socket failed token auth for service "${name}"`)
                socket.socket.close(401, 'incorrect token');
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