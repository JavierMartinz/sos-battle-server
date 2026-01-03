import { Server } from "@colyseus/core";
import { BunWebSockets } from "@colyseus/bun-websockets";
import { MyRoom } from "./rooms/MyRoom";

const port = Number(process.env.PORT ?? 2567);
const hostname = process.env.HOST ?? "0.0.0.0";

const transport = new BunWebSockets({
  port,
  hostname,
});

const gameServer = new Server({
  transport,
});

gameServer.define("sos_room", MyRoom);

gameServer.listen(port, hostname);

console.log(`Colyseus (Bun) listening on http://${hostname}:${port}`);
