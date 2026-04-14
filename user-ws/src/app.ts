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

type Binary = 0 | 1;

interface IPlayerClient {
    room: string;
    playerid: number;
    left: Binary;
    right: Binary;
    up: Binary;
    down: Binary;
}

export interface IPlayerState {
    room: string;
    playerid: number;
    x: number;
    y: number;
}
const INIT_X = 10;
const INIT_Y = 10;

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
    const players = new Map<IPlayerState["playerid"], IPlayerState>();

    const playerclient: IPlayerClient = {
        room: "",
        playerid: 0,
        left: 0,
        right: 0,
        up: 0,
        down: 0
    }

    function subscriptionHandler(message: Buffer, channel: Buffer) {
        //NOTE:::::::// CHANGE THIS TO REFLECT game displacement, then send to all the clients
        //

        //
        //
        // decode the first 2 bytes. If it's a Number less than 10 (Room string's length) ,
        // then the message is for Game engine.
        // Else, the stored bytes would be {" encoded to utf8 -> which would be 8827 @littleendian, 
        // & 31522 @bigendian. Then, it's for Chat engine.
        const firstLetter = String.fromCharCode(message[0]!);
        console.log("first letter is this", message.toString()[0], "hello");
        if (firstLetter === "R") { // ie; eg; Room ABCDE => length is 10
            // For game engine
            // Buffer is an extension of Uint8Array & has many apis attached. So it doesn't need to be 
            // decoded into a string using TextDecoder after getting Uint8Array view of an arrayBuffer
            const room = channel.toString();
            // send the player's data to every socket in the room (including the player itself)
            rooms[room]?.sockets.forEach((socket) => socket.send(message));
        }

        if (firstLetter === "{") {
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

                // Decode directions data
                binaryDecoder(data, playerclient); // decode with config set as little endian as bytes are 

                if ((ws as any).playerid === undefined) {
                    (ws as any).playerid = playerclient.playerid;
                }



                // Set server longliving PlayerState data (Inside the Map)
                let playerState: IPlayerState | undefined = players.get(playerclient.playerid);
                if (!playerState) {
                    playerState = {
                        room: playerclient.room,
                        playerid: playerclient.playerid,
                        x: INIT_X,
                        y: INIT_Y,
                    }
                    // set Server data for the playerState
                    players.set(playerclient.playerid, playerState);
                }


                const displacement = updater(playerclient, playerState);
                console.log("Displacement", displacement);


                console.log(Buffer.from(displacement));
                console.log("THIS IS THE ROOM", playerState.room);
                await client.publish(playerState.room, Buffer.from(displacement));
                console.log("Published")
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
            console.log("server running on", port);
            res([serverinstance, wss, client, clientSub]);
        });
    })

    function binaryDecoder(data: ArrayBuffer, playerclient: IPlayerClient) {
        //((I use Dataview instead of TypedArrays to get a view of ArrayBuffer bcs I need to
        // store different datatypes inside the ArrayBuffer))
        const ROOM_BYTES = 6;
        const uint8StringView = new Uint8Array(data, 0, ROOM_BYTES);
        const decoder = new TextDecoder();
        playerclient.room = decoder.decode(uint8StringView);

        const uint8ArrayView = new Uint8Array(data, ROOM_BYTES);

        if (uint8ArrayView[0] === undefined || uint8ArrayView[1] === undefined) {
            throw new Error("playerid is undefined or directions undefined");
        }

        playerclient.playerid = uint8ArrayView[0];
        console.log("PLAYer ID iS HEREEE", playerclient.playerid);
        const directionPacked = uint8ArrayView[1];

        playerclient.left = (directionPacked >> 3 & 1) as Binary;
        console.log(playerclient.left);
        playerclient.right = (directionPacked >> 2 & 1) as Binary;
        playerclient.up = (directionPacked >> 1 & 1) as Binary;
        playerclient.down = (directionPacked >> 0 & 1) as Binary;
        console.log(playerclient);
    }
    function updater(playerclient: IPlayerClient, playerState: IPlayerState) {
        // update x, y , vx, vy
        //NOTE:: // CONSTANTS NEED TO UPDATE LATER
        const vx = 10;
        const vy = 10;
        const dt = 0.1
        if (playerclient.left) {
            playerState.x = playerState.x - playerclient.left * vx * dt;
        }
        if (playerclient.right) {
            playerState.x = playerState.x + playerclient.right * vx * dt;
        }

        if (playerclient.up) {
            playerState.y = playerState.y - playerclient.up * vy * dt;
        }
        if (playerclient.down) {
            playerState.y = playerState.y + playerclient.down * vy * dt;
        }

        // convert x, y to binary then publish to other servers (ie; redis clients)
        const arrayBuffer = new ArrayBuffer(12);
        const uint8ArrayView = new Uint8Array(arrayBuffer);
        const int16ArrayView = new Int16Array(arrayBuffer, 8);

        // one byte gap here
        const encoder = new TextEncoder();
        const uint8StringView = encoder.encode(playerState.room);
        uint8ArrayView.set(uint8StringView, 0);
        uint8ArrayView[6] = playerState.playerid;
        // automatically truncates the fractional part as it's int and not float
        int16ArrayView[0] = playerState.x;
        int16ArrayView[1] = playerState.y;
        return arrayBuffer;
    }

}
