/**
 * @topic data/ipc
 * @from client
 * @from server
 * 
 * @intent ipc
 */
export interface IPCMessage {
    to: string;
    from: string;
    nonce?: any;
    message: any;
}

/**
 * @topic data/metric
 * @from client
 * 
 * @intent stat
 */
export interface Metrics {
    // in megabytes
    memory: number;
    // in percent
    cpu: number;
    url: string | null;
    location: string | null;
    [key: string]: string | number | null;
}

/**
 * @topic connection/identify
 * @from client
 * 
 * @intent identify
 */
export interface Identify {
    name: string;
    baseMetrics: Metrics;
    psk?: string;
    token?: string;
}

/**
 * @topic connection/connected
 * @from server
 * 
 * @intent connection
 */
export type Connected = boolean;