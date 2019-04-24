import dotenv from "dotenv";
import http from "http";
import express from "express";
import cws from "@clusterws/cws";
import log from "./log";
import ServiceSocket from "./ws/ServiceSocket";

export const {
    SERVER_PORT: port,
    PSK,
    USE_PSK
}: {
    SERVER_PORT: number,
    PSK: string,
    USE_PSK: boolean
} = dotenv.config().parsed as any;

const app = express();
const httpServer = http.createServer(app);
const websocketServer = new cws.WebSocketServer({ server: httpServer });

websocketServer.on('connection', (socket) => {
    new ServiceSocket(socket);
});

httpServer.listen(port, () => {
    log.info(`server is listening on port ${port}`);
});