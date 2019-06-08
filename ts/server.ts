import http from "http";
import express from "express";
import { WebSocketServer } from "@clusterws/cws";
import log from "./log";
import ServiceSocket from "./ws/ServiceSocket";
import { SERVER_PORT } from ".";

export function createBasicServer(): Promise<{
    app: express.Express,
    httpServer: http.Server,
    websocketServer: WebSocketServer
}> {
    return new Promise((resolve, reject) => {
        const app = express();
        const httpServer = http.createServer(app);
        const websocketServer = new WebSocketServer({ server: httpServer });

        websocketServer.on('connection', (socket) => {
            new ServiceSocket(socket);
        });

        httpServer.listen(SERVER_PORT, () => {
            log.info(`server is listening on port ${SERVER_PORT}`);

            resolve({
                app,
                httpServer,
                websocketServer
            });
        });
    });
}