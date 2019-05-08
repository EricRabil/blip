import "mocha";
import { port, PSK } from "../ts";
import WebSocket from "ws";

describe("Sockets", () => {
  return new Promise(async (resolve, reject) => {
    let previousUsage = process.cpuUsage();
    async function metrics() {
      const memory =
        Math.round(
          (Object.values(process.memoryUsage()).reduce((a, c) => a + c, 0) /
            1024 /
            1024) *
            100
        ) / 100;
      const cpu = (previousUsage = process.cpuUsage(previousUsage));
      const extraStat = "extra stat!";

      return {
        memory,
        cpu,
        extraStat
      };
    }

    const connection = new WebSocket(`ws://127.0.0.1:${port}`);

    const identifyPayload = {
      i: "connection/identify",
      d: {
        name: process.env.NAME,
        baseMetrics: await metrics(),
        psk: PSK,
        token: process.env.TOKEN
      }
    };

    connection.on("open", () => {
      connection.send(JSON.stringify(identifyPayload));

      connection.on("message", msg => {
        const data = JSON.parse(msg.toString());

        const { i: intent, d: payload } = data;

        switch (intent) {
          case "connection/connected":
            if (payload.token) console.log(`New token is ${payload.token}`);
            setInterval(async () => {
              connection.send(JSON.stringify(await metrics()));
            }, 10000);
            break;
          case "ipc":
            const { message, from } = payload;
            console.log(`IPC from ${from}: ${message}`);
            break;
        }
      });
    });
  });
});
