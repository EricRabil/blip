import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { promisify } from "util";
import { BlipConfigurator } from "./config";

namespace TokenUtils {
    export function generateToken(): Promise<string> {
        return promisify(randomBytes)(48).then(buff => buff.toString('hex'));
    }

    export async function encrypt(str: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(str, salt);
    }
}

/**
 * Generate a token for a service.
 * 
 * A service may not have more than one token, and the existing token must be deleted before a new one can be generated.
 */
export async function generateToken(service: string): Promise<string> {
    const config = await BlipConfigurator.loadBlip(true, true);
    const registry = config.tokenCache || (config.tokenCache = {});

    // This is a security measure to prevent a service masquerade. Manually remove the service from the file or run a CLI script.
    // You can also make a request using the old token to un-pair, but typically the old token is not accessible in this situation.
    if (registry[service]) {
        throw new Error("Service is already registered. De-register existing service or refer to documentation.");
    }

    const token = await TokenUtils.generateToken();
    const encrypted = await TokenUtils.encrypt(token);

    registry[service] = encrypted;

    await BlipConfigurator.saveBlip(config, true);

    return token;
}

/**
 * Delete a token from the registry
 * 
 * You must provide the old token to delete a token using normal APIs.
 */
export async function deleteToken(service: string, token: string): Promise<void> {
    const config = await BlipConfigurator.loadBlip(true, true);
    const registry = config.tokenCache || (config.tokenCache = {});

    const match = await checkToken(service, token);

    // Old token must be provided to delete from the registry
    if (!match) {
        throw new Error(`Incorrect token for service "${service}"`);
    }

    delete registry[service];

    await BlipConfigurator.saveBlip(config, true);
}

/**
 * Check whether a token is valid for a given service
 */
export async function checkToken(service: string, token: string): Promise<boolean> {
    const config = await BlipConfigurator.loadBlip(true, true);
    const registry = config.tokenCache || (config.tokenCache = {});

    let encrypted: string;
    if (!(encrypted = registry[service])) {
        throw new Error(`Unknown service "${service}"`);
    }

    return await bcrypt.compare(token, encrypted);
}

/**
 * Check whether a service is currently linked with Blip
 */
export async function tokenExists(service: string): Promise<boolean> {
    const config = await BlipConfigurator.loadBlip(true, true);
    const registry = config.tokenCache || (config.tokenCache = {});

    return !!registry[service];
}