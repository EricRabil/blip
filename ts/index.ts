import { BlipConfigurator, BlipConfig } from "./config";
import { SocketClient } from "./client/SocketClient";
import { createBasicServer } from "./server";

export async function blip(rawConfig?: BlipConfig<true>): Promise<any>
export async function blip(rawConfig?: BlipConfig<false>): Promise<any>
export async function blip(rawConfig?: BlipConfig<true> | BlipConfig<false>): Promise<any> {
    let config: BlipConfig<boolean> = BlipConfigurator.validateBlip(rawConfig);

    if (BlipConfigurator.Internal.isClientConfig(config)) {
        // run client mode
        const token = config.tokenCache ? config.tokenCache[config.host!] : undefined;
        
        const socketClient = new SocketClient({
            name: config.client!.name,
            host: config.host!,
            port: config.port!,
            secure: config.secure,
            token,
            key: config.psk as any
        });

        // updates and saves new token if sent by server
        socketClient.on("newToken", (token: string) => {
            (config!.tokenCache || (config!.tokenCache = {}))[config!.host!] = token;
            BlipConfigurator.saveBlip(config!, true);
        });

        return socketClient.connect().then(() => socketClient);
    } else {
        // run server mode
        return createBasicServer(config);
    }
}

export default blip;