import { WebSocket } from "@clusterws/cws";
import { Actions, Action, ActionHandler } from "./actions";
import log from "../log";
import { Metrics } from "../payloads";
import { STRICT } from "..";
import { IdentifyAction } from "./actions/connection";

function validatePayload(payload: any): payload is SocketPayload {
    return typeof payload === "object"
        && "i" in payload
        && "d" in payload
        && (
            "e" in payload ? typeof payload.e === "boolean" : true
        );
}

export interface SocketPayload {
    // intent
    i: string;
    // data
    d: any;
    // is an error
    e?: boolean;
}

export default class ServiceSocket {
    public static sockets: ServiceSocket[] = [];

    name: string;
    identified: boolean = false;
    latestMetrics: Metrics;

    constructor(public socket: WebSocket) {
        if (ServiceSocket.sockets.find(sock => sock.socket === socket)) throw new Error("Only one wrapper per socket is permitted.");
        ServiceSocket.sockets.push(this);
        socket.on("message", message => this.receive(message as string));
        socket.on("close", () => {
            const sockets = ServiceSocket.sockets;
            ServiceSocket.sockets = sockets.splice(sockets.indexOf(this));
        });

        setTimeout(async () => {
            if (this.identified) return;
            await this.sendError({
                authTimeout: true
            }, true);
        }, 60000);
    }

    get ip(): string {
        return this.socket.remoteAddress;
    }

    public send(data: SocketPayload): Promise<void> {
        return new Promise((resolve) => {
            this.socket.send(JSON.stringify(data), undefined, () => resolve());
        });
    }

    public sendError(d: any, forceClose: boolean = false): Promise<void> {
        const close = forceClose || STRICT;
        return this.send({
            i: "debug/error",
            d: {
                ...d,
                goodbye: close
            },
            e: true
            // we disconnect on error to prevent error spam
        }).then(() => (close ? this.socket.close() : Promise.resolve()));
    }

    /**
     * Intake for raw socket payloads
     * @param message the socket message
     */
    private async receive(message: string): Promise<void> {
        try {
            const payload = JSON.parse(message);
            if (!validatePayload(payload)) {
                // Invalid payload, kill it.
                return;
            }

            const {i: intent, d: data} = JSON.parse(message);

            if (intent !== IdentifyAction.intent && !this.identified) {
                // unauthenticated
                await this.sendError({
                    unauthenticated: true,
                    message: "socket must identify before accessing other intents"
                });
                return;
            }

            let action;
            if (action = Actions[intent]) {
                await ServiceSocket.runAction(this, action, data);
                return;
            }

            log.info(`invalid intent "${intent}" requested`);
        } catch (e) {
            if ((<Error>e).name === "SyntaxError") {
                if (message.trim().length === 0) {
                    log.debug("ignoring empty message from socket");
                    return;
                }

                log.warn(`socket sent malformed payload [service-name: "${this.name}"]`)
                await this.sendError({
                    syntaxError: true,
                    message: e.message
                }, true);

                return;
            }

            throw e;
        }
    }

    /**
     * Run an action for a given service
     * @param socket the service socket
     * @param action the action to run
     * @param data the data to pass to the action
     */
    public static async runAction(socket: ServiceSocket, action: Action, data: any): Promise<void> {
        let guards: ActionHandler[] | undefined;
        if (guards = action.guards) {
            for (let guard of guards) {
                if (!(await guard(socket, data))) return;
            }
        }

        await action.handler(socket, data);
    }

    /**
     * Simple helper function that determines whether a service name is in use
     * @param name the name to check for
     */
    public static async isNameInUse(name: string): Promise<boolean> {
        return !!this.sockets.find(sock => sock.name === name);
    }

    public static async findByName(name: string): Promise<ServiceSocket | null> {
        return this.sockets.find(sock => sock.name === name) || null;
    }
}