import http from "http";
import https from "https";
import express from "express";
import { WebSocketServer } from "@clusterws/cws";
import ServiceSocket from "./ws/ServiceSocket";
import { BlipConfig } from "./config";
import fs from "fs-extra";
import log from "./log";

export function createBasicServer(blipConfig: BlipConfig<true>): Promise<{
    app: express.Express,
    httpServer: http.Server,
    websocketServer: WebSocketServer
}> {
    return new Promise(async (resolve) => {
        const app = express();

        let httpServer: https.Server | http.Server;
        // detect secure settings. if present, use https
        if (blipConfig.server && blipConfig.secure && blipConfig.server.secure) {
            log.debug('using https server');
            const { keyPath, certPath, caPath } = blipConfig.server.secure;

            if (!await fs.pathExists(keyPath) || !await fs.pathExists(certPath) || (caPath && !await fs.pathExists(caPath))) {
                log.warn('invalid ssl settings, falling back to http server');
                httpServer = http.createServer(app);
            } else {
                const key = await fs.readFile(keyPath);
                const cert = await fs.readFile(certPath);
                const ca = caPath && await fs.readFile(caPath);

                httpServer = https.createServer({
                    key,
                    cert,
                    ca
                });
            }
        } else {
            log.debug('using http server');
            httpServer = http.createServer(app);
        }

        const websocketServer = new WebSocketServer({ server: httpServer });

        websocketServer.on('connection', (socket) => {
            new ServiceSocket(socket, blipConfig);
        });

        httpServer.listen(blipConfig.port, blipConfig.host, () => {
            resolve({
                app,
                httpServer,
                websocketServer
            });
        });
    });
}