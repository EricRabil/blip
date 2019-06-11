import path from "path";
import fs from "fs-extra";
import uuid from "uuid";
import log from "./log";

export interface BlipConfig<ServerConfig extends boolean = any> {
    mode: ServerConfig extends true ? "server" : "client";
    host?: string;
    port?: number;
    secure?: boolean;
    psk?: string;
    client?: ServerConfig extends true ? undefined : {
        name: string;
    };
    server?: ServerConfig extends true ? {
        pskEnabled: boolean;
        tokenEnabled: boolean;
        secure?: {
            certPath: string;
            keyPath: string;
            caPath?: string;
        }
    } : undefined;
    tokenCache?: {
        // service name in server mode, host in client mode
        [id: string]: string;
    };
    debug?: {
        disableConfigWrites?: boolean;
    }
}

export namespace BlipConfigurator {
    export const DEFAULT_BLIP_PORT = 6208;
    export const DEFAULT_BLIP_HOST = "127.0.0.1";
    export const BLIP_SECURITY_DEFAULT = false;
    export let BLIP_CONFIG_PATH = process.env.BLIP_CONFIG || path.resolve(__dirname, "..", "blip.json");
    export let readonly = false;

    export let latestBlip: BlipConfig<boolean>;

    const defaultConfig: BlipConfig<boolean> = {
        mode: "client",
        host: null as any,
        port: null as any,
        secure: null as any,
        client: undefined,
        server: undefined
    };

    export function loadBlip<T extends boolean>(async?: T, cached?: boolean): T extends true ? Promise<BlipConfig> : BlipConfig
    export function loadBlip<T extends boolean>(async: T = false as any, cached: boolean = false): Promise<BlipConfig> | BlipConfig {
        if (latestBlip && cached) return async ? Promise.resolve(latestBlip) : latestBlip;
        if (async) {
            return fs.readJSON(BLIP_CONFIG_PATH).catch(e => ({...defaultConfig})).then(value => latestBlip = value) as Promise<BlipConfig>;
        } else {
            try {
                return latestBlip = fs.readJSONSync(BLIP_CONFIG_PATH);
            } catch (e) {
                return {...defaultConfig};
            }
        }
    }

    export function saveBlip<T extends boolean>(config: BlipConfig<boolean>, async?: T): T extends true ? Promise<void> : void
    export function saveBlip<T extends boolean>(config: BlipConfig<boolean>, async: T = false as any): Promise<void> | void {
        if (readonly || process.env.DISABLE_WRITES || config.debug && config.debug.disableConfigWrites) {
            if (async) return Promise.resolve();
            return;
        }
        if (async) {
            return fs.writeJSON(BLIP_CONFIG_PATH, config, {spaces: 4});
        } else {
            return fs.writeJSONSync(BLIP_CONFIG_PATH, config, {spaces: 4});
        }
    }

    export namespace Internal {
        export function isServerConfig(config: BlipConfig<boolean>): config is BlipConfig<true> {
            return config.mode === "server"
                && typeof config.server === "object"
                && typeof config.server!.pskEnabled === "boolean"
                && (config.psk === null || typeof config.psk === "string")
                && typeof config.server!.tokenEnabled === "boolean";
        }

        export function isClientConfig(config: BlipConfig<boolean>): config is BlipConfig<false> {
            return config.mode === "client"
                && typeof config.client === "object"
                && typeof config.client!.name === "string";
        }
    }

    export function normalize<T extends boolean>(config: BlipConfig<T>): BlipConfig<T> {
        if (config.mode !== "server" && config.mode !== "client") config.mode = "client" as any;
        if (typeof config.host !== "string") config.host = DEFAULT_BLIP_HOST;
        if (isNaN(config.port = parseInt(config.port as any))) config.port = DEFAULT_BLIP_PORT;
        if (typeof config.secure !== "boolean") config.secure = BLIP_SECURITY_DEFAULT;

        const envMode = process.env.BLIP_MODE;
        if (envMode === "client" || envMode === "server") config.mode = envMode as any;

        return config;
    }

    /**
     * Validates the blip config and automagically configures missing values
     * @param config already loaded config object
     */
    export function validateBlip<T extends BlipConfig>(config?: T): T {
        const properties: BlipConfig<boolean> = normalize(config || loadBlip(false));

        properties.client = properties.client || {} as any;
        properties.server = properties.server || {} as any;

        if (properties.mode === "server" && !Internal.isServerConfig(properties)) {
            // errors in server section
            const serverConfig: BlipConfig<true>["server"] = properties!.server || (properties!.server = {} as any);
            
            const pskEnabled = serverConfig!.pskEnabled || false;
            const tokenEnabled = serverConfig!.tokenEnabled || false;

            Object.assign(serverConfig, {
                pskEnabled,
                tokenEnabled
            });

            if (pskEnabled && (!properties!.psk || properties!.psk!.trim().length === 0)) {
                properties!.psk = uuid.v4();
            }
        } else if (<any>properties.mode === "client" && !Internal.isClientConfig(properties)) {
            // errors in client section
            const clientConfig: BlipConfig<false>["client"] = (<any>properties).client!;
            
            log.debug('resolving errors in client config')
            const serviceName = clientConfig && clientConfig.name || require('moniker').choose();

            Object.assign(clientConfig, {
                serviceName
            });
        }

        saveBlip(properties);
        return latestBlip = properties as any;
    }
}