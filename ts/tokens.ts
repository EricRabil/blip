import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import fs from "fs-extra";
import path from "path";
import { promisify } from "util";
import { TOKEN_REGISTRY_PATH } from ".";

namespace TokenUtils {
    export function generateToken(): Promise<string> {
        return promisify(randomBytes)(48).then(buff => buff.toString('hex'));
    }

    export async function encrypt(str: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(str, salt);
    }
}

interface TokenRegistry {
    [serviceName: string]: string;
}

async function loadTokenRegistry(): Promise<TokenRegistry> {
    return fs.readJSON(TOKEN_REGISTRY_PATH || path.resolve(__dirname, "data.json"));
}

async function saveTokenRegistry(registry: TokenRegistry): Promise<void> {
    return fs.writeJSON(TOKEN_REGISTRY_PATH || path.resolve(__dirname, "data.json"), registry);
}

/**
 * Generate a token for a service.
 * 
 * A service may not have more than one token, and the existing token must be deleted before a new one can be generated.
 */
export async function generateToken(service: string): Promise<string> {
    const registry = await loadTokenRegistry();

    // This is a security measure to prevent a service masquerade. Manually remove the service from the file or run a CLI script.
    // You can also make a request using the old token to un-pair, but typically the old token is not accessible in this situation.
    if (registry[service]) {
        throw new Error("Service is already registered. De-register existing service or refer to documentation.");
    }

    const token = await TokenUtils.generateToken();
    const encrypted = await TokenUtils.encrypt(token);

    registry[service] = encrypted;

    await saveTokenRegistry(registry);

    return token;
}

/**
 * Delete a token from the registry
 * 
 * You must provide the old token to delete a token using normal APIs.
 */
export async function deleteToken(service: string, token: string): Promise<void> {
    const registry = await loadTokenRegistry();
    const match = await checkToken(service, token);

    // Old token must be provided to delete from the registry
    if (!match) {
        throw new Error(`Incorrect token for service "${service}"`);
    }

    delete registry[service];

    await saveTokenRegistry(registry);
}

/**
 * Check whether a token is valid for a given service
 */
export async function checkToken(service: string, token: string): Promise<boolean> {
    const registry = await loadTokenRegistry();

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
    const registry = await loadTokenRegistry();

    return !!registry[service];
}