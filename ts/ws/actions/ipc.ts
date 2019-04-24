import { Action } from ".";
import { IPCMessage } from "../../payloads";
import ServiceSocket from "../ServiceSocket";

export const IPCAction: Action = {
    intent: "ipc",
    handler: async (service, message: IPCMessage) => {
        const { to, nonce } = message;

        const recipient = await ServiceSocket.findByName(to);

        if (!recipient) {
            await service.send({
                i: 'ipc',
                d: {
                    unknownService: true,
                    serviceName: to,
                    nonce
                },
                e: true
            });

            return;
        }

        await recipient.send({
            i: 'ipc',
            d: message
        });
    }
}