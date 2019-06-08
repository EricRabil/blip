import "mocha";
import { createBasicServer } from "../ts/server";
import { SocketClient } from "../ts/client/SocketClient";

describe("Blip Infrastructure", async function () {
  await createBasicServer();

  const client1 = new SocketClient({
    name: "client1",
    host: "127.0.0.1",
    port: 8352
  });

  const client2 = new SocketClient({
    name: "client2",
    host: "127.0.0.1",
    port: 8352
  });

  await Promise.all([client1.connect(), client2.connect()]);

  client1.ipc("client2", "hey bitch!", {
    expectResponse: true,
    nonce: "bitch-chat"
  }).then(console.log);

  client2.on("ipc", async msg => {
    if (msg.from !== "client1") return;
    if (msg.message === "hey bitch!") {
      await msg.reply("hey girl!");
    }
  });
});
