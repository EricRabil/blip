import { Action } from ".";
import { Metrics } from "../../payloads";
import log from "../../log";

function validateMetrics(metrics: any): metrics is Metrics {
    return typeof metrics === "object"
        && "memory" in metrics && typeof metrics["memory"] === "number"
        && "cpu" in metrics && typeof metrics["cpu"] === "number"
        && "url" in metrics
        && "location" in metrics
}

/**
 * Intent for updating metrics
 */
export const MetricAction: Action = {
    intent: "metrics/update",
    handler: async (socket, metrics: Metrics) => {
        if (!validateMetrics(metrics)) {
            log.warn(`socket sent malformed metrics [service-name=${socket.name}]`);
            await socket.sendError({
                metrics: true,
                message: "invalid metrics payload"
            });
            return;
        }
        socket.latestMetrics = metrics;
    }
}