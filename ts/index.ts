import dotenv from "dotenv";
import path from "path";

export const {
    SERVER_PORT,
    PSK,
    USE_PSK,
    USE_TOKEN,
    TOKEN_REGISTRY_PATH,
    STRICT
}: {
    SERVER_PORT: number,
    PSK: string,
    USE_PSK: boolean,
    USE_TOKEN: boolean,
    TOKEN_REGISTRY_PATH: string,
    STRICT: boolean
} = dotenv.config({path: path.resolve(__dirname, "..", ".env")}).parsed as any;