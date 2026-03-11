import WebSocket, { WebSocketServer } from 'ws';
import http, { Server } from 'http';
import express from 'express';
import { createClient } from "redis";
import { chatRoomOnMessage, chatRoomOnClose } from './controllers/chatRoom.controller.js';


export type ClientType = ReturnType<typeof createClient>;
// use Map with Set as the value - the next time 
export interface Room {
    sockets: WebSocket[];
}

export default async function createServer(port: number) {

    const app = express();
    const server = http.createServer(app);
    const client = await createClient()
        .on("error", (err) => console.log("Redis Client Error", err))
        .connect();

    const clientSub = client.duplicate();
    await clientSub.connect();

    const wss = new WebSocketServer({ server });


    const rooms: Record<string, Room | undefined> = {
    }
    wss.on('connection', function connection(ws) {
        console.log("websocket client connected");
        ws.on('error', console.error);

        // ws only accepts string or binary - and receives at onmessage @server as arrayBuffer ie Binary and @client as 
        // EventObject with data property as string automatically
        ws.on('message', async function message(data) {
            await chatRoomOnMessage(rooms, data, ws, { client, clientSub });
        });

        // When close event happens due to abrupt TCP disconnection due to Browser or the client being terminated
        // or when client closes the tcp connection gracefully
        ws.on("close", async (code, reason) => {
            await chatRoomOnClose(rooms, ws, code, reason, { client, clientSub });
        })

    });

    app.get("/", (_, res) => {
        console.log("helooo");
        return res.send("heyy");
    })


    return new Promise<[Server, WebSocketServer, ClientType, ClientType]>((res, _) => {
        const serverinstance = server.listen(port, () => {
            console.log("server running on ", port);
            res([serverinstance, wss, client, clientSub]);
        });
    })


}
