import { Action } from ".";
import { IPCMessage } from "../../payloads";
import ServiceSocket from "../ServiceSocket";

/**
 * Intent for sending data to another connected service
 */
export const IPCAction: Action = {
    intent: "ipc",
    handler: async (service, { to, message, nonce }: IPCMessage) => {
        const recipient = await ServiceSocket.findByName(to);

        if (!recipient) {
            await service.sendError({
                unknownService: true,
                serviceName: to,
                nonce
            });

            return;
        }

        await recipient.send({
            i: 'ipc',
            d: {
                from: service.name,
                message,
                nonce
            }
        });
    }
}

export const IPCDiscover: Action = {
    intent: "ipc/discover",
    handler: async (service) => {
        const services = ServiceSocket.sockets.map(s => s.name);

        await service.send({
            i: "ipc/discover",
            d: {
                services
            }
        });
    }
}