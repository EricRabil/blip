import { Action } from ".";
import { Metrics } from "../../payloads";

export const MetricAction: Action = {
    intent: "metrics/update",
    handler: async (socket, metrics: Metrics) => {
        socket.latestMetrics = metrics;
    }
}