import { EventEmitter } from "events";
import WebSocket from "ws";
import uuid = require("uuid");
import log from "../log";

export interface SocketClientOptions {
  name: string;
  host: string;
  port: number;
  key?: string;
  secure?: boolean;
  token?: string;
  customMetrics?: () => { [key: string]: any };
}

export interface IPCMessage {
  from: string;
  message: string;
  nonce?: string;
  reply: (msg: string) => Promise<void>
}

export declare interface SocketClient {
  on(event: "ipc", cb: (msg: IPCMessage) => any): this;
  on(event: string, cb: (...args: any[]) => any): this;
}

export class SocketClient extends EventEmitter {
  public readonly uri: string;
  public readonly serviceName: string;
  private token: string | null;
  private key: string | null;
  private metricsPopulator?: () => { [key: string]: any };

  private connection: WebSocket;

  private pendingIPC: {
    [nonce: string]: {
      resolve: (...args: any[]) => any,
      reject: (...args: any[]) => any
    };
  } = {};

  public constructor({
    name,
    host,
    port,
    secure,
    token,
    key,
    customMetrics
  }: SocketClientOptions) {
    super();
    this.uri = `ws${secure ? "s" : ""}://${host}:${port}`;
    this.serviceName = name;
    this.token = token || null;
    this.key = key || null;
    this.metricsPopulator = customMetrics;
  }

  private connectCallback: (() => void) | null = null;

  public connect(): Promise<void> {
    if (this.connectCallback) return Promise.reject(new Error("This client is already in the midst of connecting."));
    return new Promise(async (resolve) => {
      this.connection = new WebSocket(this.uri);

      this.connection.on("open", async () => {
        await this.send(await this.identifyPayload());

        this.connection.on("message", msg => this.messageIntake(msg.toString()));
      });

      this.connection.on("close", async () => {
        this.stopMetrics();
      });

      this.connectCallback = resolve;
    });
  }

  public send(payload: any): Promise<void> {
    if (typeof payload === "object") payload = JSON.stringify(payload);
    return new Promise((resolve, reject) => this.connection.send(payload, e => e ? reject(e) : resolve()));
  }

  /**
   * Send an IPC message
   * @param to the service to send a message to
   * @param message the message to send
   * @param options the message options (regarding response delivery)
   */
  public ipc(to: string, message: string, options?: { expectResponse?: boolean, nonce?: string }): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let expectResponse = false, nonce: string | null = null;
      if (options) {
        const { expectResponse: response, nonce: str } = options;
        if (typeof response === "boolean") expectResponse = response;
        if (typeof str === "string") nonce = str;
      }

      // auto-generate nonce if none supplied
      if (expectResponse && !nonce) {
        nonce = uuid.v1();
      }

      await this.send({
        i: "ipc",
        d: {
          to,
          message,
          nonce
        }
      });

      // Stop function execution and wait for an IPC response
      if (expectResponse && nonce) {
        return this.pendingIPC[nonce] = { resolve, reject };
      }

      // Immediately resolve as we are not expecting a response
      return resolve();
    });
  }

  protected async messageIntake(msg: string): Promise<void> {
    log.debug(`${this.serviceName} received msg: ${msg}`);
    const {
      i: intent,
      d: payload
    } = JSON.parse(msg);

    switch (intent) {
      case "connection/connected":
        // The server can issue a new token whenever it wants, but typically only issues the token on first connection with any given service name
        if (payload.token) {
          this.token = payload.token;
          this.emit("newToken", this.token);
        }
        this.startMetrics();
        if (this.connectCallback) {
          this.connectCallback();
          this.connectCallback = null;
        }
        break;
      case "ipc":
        const { message, from, nonce } = payload;
        // If this is a response to a sent IPC message, we don't emit it as someone is already expecting it.
        if (this.pendingIPC[nonce]) {
          this.pendingIPC[nonce].resolve(message);
          break;
        }
        // Emit. >:)
        this.emit("ipc", {
          from, message, nonce, reply: async (msg: string) => {
            if (!nonce) throw new Error("Cannot reply to a non-nonce message");
            return this.ipc(from, msg, { nonce });
          }
        });
        break;
    }
  }

  private async identifyPayload() {
    return {
      i: "connection/identify",
      d: {
        name: this.serviceName,
        baseMetrics: await this.metrics(),
        token: this.token,
        psk: this.key
      }
    };
  }

  private timer: NodeJS.Timeout;

  public startMetrics() {
    if (this.timer) clearInterval(this.timer);

    return this.timer = setInterval(async () => {
      this.send(JSON.stringify({
        i: "metrics/update",
        d: await this.metrics()
      }));
    }, 10000);
  }

  public stopMetrics() {
    clearInterval(this.timer);
  }

  private async metrics() {
    return {
      ...await SocketClient.metrics(),
      ...(this.metricsPopulator ? await this.metricsPopulator() : {})
    }
  }

  private static previousUsage: NodeJS.CpuUsage = process.cpuUsage();

  /**
   * Generates a metrics payload. It's static as this is instance-agnostic and relies on the process
   */
  private static async metrics() {
    const memory =
      Math.round(
        (Object.values(process.memoryUsage()).reduce((a, c) => a + c, 0) /
          1024 /
          1024) *
        100
      ) / 100;
    const cpu = (this.previousUsage = process.cpuUsage(this.previousUsage));

    return {
      memory,
      cpu
    };
  }
}
