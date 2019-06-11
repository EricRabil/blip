import "mocha";
import blip from "../ts";
import { SocketClient } from "../ts/client/SocketClient";

/**
 * @todo SSL
 * @todo mail server
 * @todo auth server
 * @todo create auth server api for blip and make it seamless and simple
 */

describe("Blip Infrastructure", async function () {
  await blip({
    mode: "server"
  });

  const client1: SocketClient = await blip({
    mode: "client",
    client: {
      name: "client1"
    }
  });

  const client2: SocketClient = await blip({
    mode: "client",
    client: {
      name: "client2"
    }
  });
  
  client1.ipc("client2", Date.now().toString());

  client2.on("ipc", async msg => console.log(`${Date.now() - parseInt(msg.message)}ms`));
});
