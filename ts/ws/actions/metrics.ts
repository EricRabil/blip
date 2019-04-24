import { Action } from ".";
import { Metrics } from "../../payloads";

export const MetricAction: Action = {
    intent: "trackMetrics",
    handler: async (socket, metrics: Metrics) => {
        socket.latestMetrics = metrics;
    }
}