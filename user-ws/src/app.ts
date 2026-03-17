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

// interface IPosition {
//     x: number;
//     y: number;
// }
// interface IVelocity {
//     vx: number;
//     vy: number;
// }
//
// interface IPlayer {
//     room: string;
//     playerid: number;
//     position: IPosition;
//     velocity: IVelocity;
// }

interface IPlayerBin {
    room: string;
    playerid: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
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
    // a map because, players can be removed and added when client socket disconnects or connects 
    // (ws is attached -> the Room & Playerid)
    const players = new Map<IPlayerBin["playerid"], IPlayerBin>();

    const player: IPlayerBin = {
        room: "",
        playerid: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
    };
    function subscriptionHandler(message: Buffer, channel: Buffer) {
        console.log("SubscriptionHandler message is this", message.constructor.name);
        // decode the first 2 bytes. If it's a Number less than 10 (Room string's length) ,
        // then the message is for Game engine.
        // Else, the stored bytes would be {" encoded to utf8 -> which would be 8827 @littleendian, 
        // & 31522 @bigendian. Then, it's for Chat engine.
        const length = message.readUint16LE(0); // Little endian

        if (length <= 10) { // ie; eg; Room ABCDE => length is 10
            // For game engine
            // Buffer is an extension of Uint8Array & has many apis attached. So it doesn't need to be 
            // decoded into a string using TextDecoder after getting Uint8Array view of an arrayBuffer
            const room = channel.toString();
            // send the player's data to every socket in the room (including the player itself)
            rooms[room]?.sockets.forEach((socket) => socket.send(message));
        }

        if (length > 10) {
            // For chat engine

            const room = channel.toString();
            console.log(rooms);
            rooms[room]?.sockets.forEach((socket) => socket.send(message.toString()));

        }

    }

    wss.on('connection', function connection(ws) {
        console.log("websocket client connected");

        ws.binaryType = "arraybuffer";

        ws.on('error', console.error);

        // ws only accepts string or binary - and receives at onmessage @server as arrayBuffer ie Binary and @client as 
        // EventObject with data property as string automatically
        ws.on('message', async function message(data, isBinary) {
            if (isBinary && data instanceof ArrayBuffer) {
                // Game engine 
                binaryDecoder(data); // decode with config set as little endian as bytes are 
                // written into the arrayBuffer using the config of little endianness
                if ((ws as any).playerid === undefined) {
                    (ws as any).playerid = player.playerid;
                }
                // set Server data for the player
                if (!players.has(player.playerid)) {
                    // if there is no map set with the global player, then set the Map. otherwise
                    // the Map's value will be updated automatically
                    players.set(player.playerid, player);

                }

                console.log("here is the data that is published from Gameengine", data);
                console.log(Buffer.from(data));
                await client.publish(player.room, Buffer.from(data));
            } else {
                // a String
                // Chat engine
                await chatRoomOnMessage(rooms, data, ws, subscriptionHandler, { client, clientSub });
            }

        });

        // When close event happens due to abrupt TCP disconnection due to Browser or the client being terminated
        // or when client closes the tcp connection gracefully
        ws.on("close", async (code, reason) => {
            // Chat + Game engine
            const playerid = (ws as any).playerid;
            players.delete(playerid);
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

    function binaryDecoder(data: ArrayBuffer) {
        //((I use Dataview instead of TypedArrays to get a view of ArrayBuffer bcs I need to
        // store different datatypes inside the ArrayBuffer))
        const view = new DataView(data);

        // string would be encoded like this : 12encodedstring where 12 is the length of encoded bytes (same 
        // as the number of chars - which would be stored in a fixed memory like int8 or int16)

        // ArrayBuffer is of 11 bytes + 6 bytes
        const strlength = view.getUint16(0, true); // should be looked as little endian
        console.log("stringlength", strlength);
        const typedArray = new Uint8Array(data, 2, strlength); //strlength would be 6 chars ie; 6 bytes: Room 1, Room 2 ,etc..
        const decoder = new TextDecoder();
        player.room = decoder.decode(typedArray);
        player.playerid = view.getUint32(strlength + 2, true)
        player.x = view.getFloat32(strlength + 6, true);
        player.y = view.getFloat32(strlength + 10, true);
        player.vx = view.getFloat32(strlength + 14, true);
        player.vy = view.getFloat32(strlength + 18, true);
    }

}
