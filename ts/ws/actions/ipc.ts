import { Action } from ".";
import { IPCMessage } from "../../payloads";
import ServiceSocket from "../ServiceSocket";

export const IPCAction: Action = {
    intent: "ipc",
    handler: async (service, message: IPCMessage) => {
        const { to, nonce } = message;

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
            d: message
        });
    }
}