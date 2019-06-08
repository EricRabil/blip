import fs from "fs-extra";
import path from "path";
import ServiceSocket from "../ServiceSocket";

export type ActionHandler = (socket: ServiceSocket, data: any) => Promise<boolean | void>;

export interface Action {
    intent: string;
    guards?: ActionHandler[];
    handler: ActionHandler;
}

/**
 * Magic object generated at runtime, represents all actions from all files in this folder
 */
export const Actions: {[key: string]: Action} = fs.readdirSync(__dirname)
    .filter(file => (file.endsWith(".js") || file.endsWith(".ts")) && (file.split(".").length === 2) && (file !== "index.ts"))
    .map(file => path.resolve(__dirname, file))
    .map(file => require(file))
    .map(file => Object.values(file))
    .reduce((arr, c) => { arr = arr.concat(c); return arr; }, [] as any[])
    .reduce((obj, c) => { obj[c.intent] = c; return obj; }, {} as {[key: string]: any});