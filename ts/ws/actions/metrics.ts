import { Action } from ".";
import { Metrics } from "../../payloads";
import log from "../../log";
import ServiceSocket from "../ServiceSocket";

function validateMetrics(metrics: any): metrics is Metrics {
    return typeof metrics === "object"
        && "memory" in metrics && typeof metrics["memory"] === "number"
        && "cpu" in metrics && typeof metrics["cpu"] === "number";
}

/**
 * Intent for updating metrics
 */
export const MetricAction: Action = {
    intent: "metrics/update",
    handler: async (socket, metrics: Metrics) => {
        if (!validateMetrics(metrics)) {
            log.warn(`socket sent malformed metrics [service-name=${socket.name}] ${JSON.stringify(metrics)}`);
            await socket.sendError({
                metrics: true,
                message: "invalid metrics payload"
            });
            return;
        }
        socket.latestMetrics = metrics;
    }
}

/**
 * Intent for fetching metrics
 * 
 * @todo restrict intent to authorized services
 */
export const MetricFetchAction: Action = {
    intent: "metrics/fetch",
    handler: async (socket) => {
        const metrics: {
            [key: string]: Metrics;
        } = ServiceSocket.sockets.reduce((a, c) => (a[c.name] = c.latestMetrics) && a, {} as any);

        await socket.send({
            i: "metrics/all",
            d: metrics
        });
    }
}