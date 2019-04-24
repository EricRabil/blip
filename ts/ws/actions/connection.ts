import { Action } from ".";
import { Identify } from "../../payloads";
import ServiceSocket from "../ServiceSocket";
import log from "../../log";
import { USE_PSK, PSK } from "../..";

export const IdentifyAction: Action = {
    intent: "identify",
    handler: async (socket, {name, baseMetrics, psk}: Identify) => {
        // sockets cant re-identify. they must make a new session.
        if (socket.identified) return;
        if (await ServiceSocket.isNameInUse(name)) {
            socket.socket.close(400, 'name is in use.');
            log.warn(`socket failed identification beacuse it attempted to use a name in-use "${name}"`);
            return;
        }

        if (USE_PSK && (PSK !== psk)) {
            socket.socket.close(401, 'incorrect psk');
            return;
        }

        socket.name = name;
        socket.latestMetrics = baseMetrics;
        socket.identified = true;
    }
}